const express = require('express');
const router = express.Router();
const { model, modelWithTools } = require('../../gemini');
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
      `SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
      [this.sessionId]
    );
    return rows.map(row =>
      row.role === 'human'
        ? new HumanMessage(row.content)
        : new AIMessage(row.content)
    );
  }

  async addMessage(message) {
    const role = message._getType() === 'human' ? 'human' : 'ai';
    await pool.execute(
      `INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)`,
      [this.sessionId, role, message.content]
    );
  }

  async addUserMessage(content) {
    await this.addMessage(new HumanMessage(content));
  }

  async addAIChatMessage(content) {
    await this.addMessage(new AIMessage(content));
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

// const chain = prompt.pipe(modelWithTools);

// const chainWithHistory = new RunnableWithMessageHistory({
//   runnable: chain,
//   getMessageHistory: (sessionId) => new MariaDBChatHistory(sessionId),
//   inputMessagesKey: 'input',
//   historyMessagesKey: 'history',
// });

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

    // original code to invoke simple model
    // const response = await chainWithHistory.invoke(
    //   { input: text },
    //   { configurable: { sessionId: sessionId.toString() } }
    // );

    // new code that allows for tools with simple model
    const history = new MariaDBChatHistory(sessionId.toString());
    const pastMessages = await history.getMessages();

    const allMessages = [...pastMessages, new HumanMessage(text)];
    let currentMessages = allMessages;
    let reply;

    // loop until model stops making tool calls
    while (true) {
      const response = await modelWithTools.invoke(currentMessages);

      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolCall = response.tool_calls[0];
        console.log('Tool call:', toolCall);

        const allTools = [getCompletedOrdersTool, getCompletedOrdersForProductTool, tabulateSalesTool, getLowStockTool];
        const toolToCall = allTools.find(t => t.name === toolCall.name);

        let toolResult;
        if (toolToCall) {
          toolResult = await toolToCall.invoke(toolCall.args);
          console.log('Tool result:', toolResult);
        } else {
          toolResult = 'Tool not found.';
        }

        // add tool call and result to messages and loop again
        currentMessages = [
          ...currentMessages,
          response,
          { role: 'tool', content: toolResult, tool_call_id: toolCall.id }
        ];
      } else {
        // no more tool calls, extract text reply
        const content = response.content;
        if (Array.isArray(content)) {
          reply = content.map(part => typeof part === 'string' ? part : part.text || '').join('');
        } else {
          reply = content?.toString() || '(no reply)';
        }
        break;
      }
    }

    await history.addUserMessage(text);
    await history.addAIChatMessage(reply);

    res.json({ reply });

    // res.json({ reply: response.content });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ reply: 'Sorry, something went wrong.' });
  }
});

module.exports = router;