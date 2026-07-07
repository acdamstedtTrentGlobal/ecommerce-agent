const { ChatGoogle } = require('@langchain/google/node');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
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

const agent = createReactAgent({
  llm: model,
  tools,
  messageModifier: 'You are a helpful admin assistant for an ecommerce store. Format your responses using markdown.',
});

module.exports = { model, modelWithTools, agent };