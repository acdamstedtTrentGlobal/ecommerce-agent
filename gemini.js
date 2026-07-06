const { ChatGoogle } = require('@langchain/google/node');
const { getCompletedOrdersTool, getCompletedOrdersForProductTool, tabulateSalesTool, getLowStockTool } = require('./admin/tools/salesTools.js');

const model = new ChatGoogle({
    model: 'gemini-3.1-flash-lite',
    apiKey: process.env.GEMINI_API_KEY,
});

const tools = [
  getCompletedOrdersTool,
  getCompletedOrdersForProductTool,
  tabulateSalesTool,
  getLowStockTool
];

const modelWithTools = new ChatGoogle({
    model: 'gemini-3.1-flash-lite',
    apiKey: process.env.GEMINI_API_KEY,
}).bindTools(tools);

module.exports = { model, modelWithTools };