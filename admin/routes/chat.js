const express = require('express');
const { model } = require('../../gemini');
const { BaseChatMessageHistory } = require('@langchain/core/chat_history');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { RunnableWithMessageHistory } = require('@langchain/core/runnables');
const pool = require('../../database');
const router = express.Router();

function ensureAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect('/admin/login');
}

// setup chatbot history
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

const chain = prompt.pipe(model);

const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: (sessionId) => new MariaDBChatHistory(sessionId),
  inputMessagesKey: 'input',
  historyMessagesKey: 'history',
});

router.get('/', ensureAdmin, async (req, res) => {
  const sessionId = `admin_${req.session.admin.id}`;
  const history = new MariaDBChatHistory(sessionId);
  const messages = await history.getMessages();

  const formattedHistory = messages.map(m => ({
    text: m.content,
    role: m._getType() === 'human' ? 'user' : 'bot',
    side: m._getType() === 'human' ? 'right' : 'left',
  }));

  res.render('chat', { admin: req.session.admin, history: formattedHistory });
});

router.post('/api', ensureAdmin, express.json(), async (req, res) => {
  try {
    const { message } = req.body || {};
    const text = (message || '').toString().trim();
    if (!text) return res.json({ reply: 'Please type something.' });

    const sessionId = `admin_${req.session.admin.id}`;

    const response = await chainWithHistory.invoke(
      { input: text },
      { configurable: { sessionId } }
    );

    res.json({ reply: response.content });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ reply: 'Sorry, something went wrong.' });
  }
});

router.post('/clear', ensureAdmin, async (req, res) => {
  const sessionId = `admin_${req.session.admin.id}`;
  const history = new MariaDBChatHistory(sessionId);
  await history.clear();
  res.json({ success: true });
});

module.exports = router;
