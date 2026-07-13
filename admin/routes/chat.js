const express = require('express');
const router = express.Router();
const { model, modelWithTools, agent } = require('../../gemini');
const { getCompletedOrdersTool, getCompletedOrdersForProductTool, tabulateSalesTool, getLowStockTool } = require('../tools/salesTools');
const { BaseChatMessageHistory } = require('@langchain/core/chat_history');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { RunnableWithMessageHistory } = require('@langchain/core/runnables');
const pool = require('../../database');

function ensureAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect('/admin/login');
}

class MariaDBChatHistory extends BaseChatMessageHistory {
  constructor(sessionId) {
    super();
    this.sessionId = sessionId;
  }

  async getMessages() {
    const [rows] = await pool.execute(
      `SELECT role, content, chart_config FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
      [this.sessionId]
    );
    return rows.map(row => {
      const msg = row.role === 'human'
        ? new HumanMessage(row.content)
        : new AIMessage(row.content);
      msg.chartConfig = row.chart_config ? JSON.parse(row.chart_config) : null;
      return msg;
    });
  }

  async addMessage(message, chartConfig = null) {
    const role = message._getType() === 'human' ? 'human' : 'ai';
    await pool.execute(
      `INSERT INTO chat_messages (session_id, role, content, chart_config) VALUES (?, ?, ?, ?)`,
      [this.sessionId, role, message.content, chartConfig ? JSON.stringify(chartConfig) : null]
    );
  }

  async addUserMessage(content) {
    await this.addMessage(new HumanMessage(content));
  }

  async addAIChatMessage(content, chartConfig = null) {
    await this.addMessage(new AIMessage(content), chartConfig);
  }

  async clear() {
    await pool.execute(
      `DELETE FROM chat_messages WHERE session_id = ?`,
      [this.sessionId]
    );
  }
}

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful admin assistant for an ecommerce store. Format your responses using markdown.'],
  new MessagesPlaceholder('history'),
  ['human', '{input}'],
]);

// render chat page
router.get('/', ensureAdmin, async (req, res) => {
  const adminId = req.session.admin.id;

  // get all sessions for this admin
  const [sessions] = await pool.execute(
    `SELECT id, title, created_at FROM chat_sessions WHERE admin_id = ? ORDER BY created_at DESC`,
    [adminId]
  );

  // get active session from query param, or default to most recent
  let activeSessionId = req.query.session ? parseInt(req.query.session) : null;
  let messages = [];

  if (!activeSessionId && sessions.length > 0) {
    activeSessionId = sessions[0].id;
  }

  if (activeSessionId) {
    const history = new MariaDBChatHistory(activeSessionId);
    const msgs = await history.getMessages();
    messages = msgs.map(m => ({
      text: m.content,
      role: m._getType() === 'human' ? 'user' : 'bot',
      side: m._getType() === 'human' ? 'right' : 'left',
      chart: m.chartConfig || null
    }));
  }

  res.render('chat', {
    admin: req.session.admin,
    sessions,
    activeSessionId,
    history: messages
  });
});

// create new session
router.post('/sessions', ensureAdmin, express.json(), async (req, res) => {
  const adminId = req.session.admin.id;
  const title = new Date().toLocaleString();
  const [result] = await pool.execute(
    `INSERT INTO chat_sessions (admin_id, title) VALUES (?, ?)`,
    [adminId, title]
  );
  res.json({ sessionId: result.insertId });
});

// delete session
router.post('/sessions/:id/delete', ensureAdmin, async (req, res) => {
  const adminId = req.session.admin.id;
  await pool.execute(
    `DELETE FROM chat_sessions WHERE id = ? AND admin_id = ?`,
    [req.params.id, adminId]
  );
  res.json({ success: true });
});

// chat API
router.post('/api', ensureAdmin, express.json(), async (req, res) => {
  try {
    const { message, sessionId } = req.body || {};
    const text = (message || '').toString().trim();
    if (!text) return res.json({ reply: 'Please type something.' });
    if (!sessionId) return res.status(400).json({ reply: 'No session selected.' });

    const history = new MariaDBChatHistory(sessionId.toString());
    const pastMessages = await history.getMessages();

    // set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    let reply = '';
    let chart = null;
    let lastAgentContent = null;

    // agent.stream lets us see the agent's react loop
    const stream = await agent.stream(
      { messages: [...pastMessages, new HumanMessage(text)] },
      { recursionLimit: 50, configurable: { sessionId: sessionId.toString() } }
    );

    for await (const step of stream) {
      const keys = Object.keys(step);
      if (keys.includes('model_request')) {
        const rawMsg = step.model_request.messages?.[0];
        const content = rawMsg?.content;

        if (Array.isArray(content)) {
          for (const part of content) {
            if (part.type === 'functionCall' && part.functionCall?.name !== 'write_todos') {
              console.log(`🔧 [AGENT] Calling tool: ${part.functionCall.name}`, JSON.stringify(part.functionCall.args));
              sendEvent('tool_call', { tool: part.functionCall.name, args: part.functionCall.args });
            }
            if (part.type === 'text' && part.text) {
              console.log(`💬 [AGENT] Final response generated`);
              lastAgentContent = part.text;
            }
          }
        } else if (typeof content === 'string' && content) {
          console.log(`💬 [AGENT] Final response generated`);
          lastAgentContent = content;
        }
      }
      if (step.model_request) {
        const msg = step.model_request.messages?.[0];
        const content = msg?.kwargs?.content;

        if (Array.isArray(content)) {
          for (const part of content) {
            if (part.type === 'functionCall' && part.functionCall?.name !== 'write_todos') {
              console.log(`🔧 [AGENT] Calling tool: ${part.functionCall.name}`, JSON.stringify(part.functionCall.args));
              sendEvent('tool_call', { tool: part.functionCall.name, args: part.functionCall.args });
            }
            if (part.type === 'text' && part.text) {
              console.log(`💬 [AGENT] Final response generated`);
              lastAgentContent = part.text;
            }
          }
        } else if (typeof content === 'string' && content) {
          console.log(`💬 [AGENT] Final response generated`);
          lastAgentContent = content;
        }
      }

      if (step.tools) {
        for (const toolMsg of step.tools.messages) {
          console.log(`✅ [TOOL] Result from ${toolMsg.name}:`, toolMsg.content.substring(0, 300));
          sendEvent('tool_result', { tool: toolMsg.name, result: toolMsg.content.substring(0, 200) });
          try {
            const parsed = JSON.parse(toolMsg.content);
            if (parsed.chart && parsed.series) chart = parsed;
          } catch (e) {}
        }
      }
    }

    if (Array.isArray(lastAgentContent)) {
      reply = lastAgentContent.map(part => typeof part === 'string' ? part : part.text || '').join('');
    } else {
      reply = lastAgentContent?.toString() || '(no reply)';
    }

    await history.addUserMessage(text);
    await history.addAIChatMessage(reply, chart);
    sendEvent('done', { reply, chart });
    res.end();

  } catch (error) {
    console.error('Chat error:', error);
    res.write(`data: ${JSON.stringify({ type: 'done', reply: 'Sorry, something went wrong.' })}\n\n`);
    res.end();
  }
});

module.exports = router;