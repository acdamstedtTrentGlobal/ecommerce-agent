const { ChatGoogle } = require('@langchain/google/node');

const model = new ChatGoogle({
    model: 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY,
});

module.exports = { model };