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

    // the agent does the react loop logic on its own, simplifying the code
    const history = new MariaDBChatHistory(sessionId.toString());
    const pastMessages = await history.getMessages();

    const result = await agent.invoke({
      messages: [...pastMessages, new HumanMessage(text)]
    });

    const lastMessage = result.messages[result.messages.length - 1];
    let reply = lastMessage.content;
    if (Array.isArray(reply)) {
      reply = reply.map(part => typeof part === 'string' ? part : part.text || '').join('');
    } else {
      reply = reply?.toString() || '(no reply)';
    }

    await history.addUserMessage(text);
    await history.addAIChatMessage(reply);

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ reply: 'Sorry, something went wrong.' });
  }
});

module.exports = router;