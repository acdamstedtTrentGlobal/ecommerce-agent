const { ChatGoogle } = require('@langchain/google/node');
const { createAgent, todoListMiddleware } = require('langchain');
const { getCompletedOrdersTool, getCompletedOrdersForProductTool, tabulateSalesTool, getLowStockTool } = require('./admin/tools/salesTools.js');
const { generateApexChartTool } = require('./admin/tools/chartTools');
const { searchProductBySemanticTool, answerProductQuestionTool } = require('./admin/tools/ragTools');
const { getProductDetailsTool, createRestockOrderTool, getCurrentDateTimeTool } = require('./admin/tools/planningTools');

const model = new ChatGoogle({
    model: 'gemini-3.1-flash-lite',
    apiKey: process.env.GEMINI_API_KEY,
});

const tools = [
  getCompletedOrdersTool,
  getCompletedOrdersForProductTool,
  tabulateSalesTool,
  getLowStockTool,
  generateApexChartTool,
  searchProductBySemanticTool,
  answerProductQuestionTool,
  getProductDetailsTool,
  createRestockOrderTool,
  getCurrentDateTimeTool
];

const modelWithTools = new ChatGoogle({
    model: 'gemini-3.1-flash-lite',
    apiKey: process.env.GEMINI_API_KEY,
}).bindTools(tools);

const agent = createAgent({
  model: model,
  tools,
  prompt: 'You are a helpful admin assistant for an ecommerce store. Format your responses using markdown.',
  middleware: [todoListMiddleware()],
  recursionLimit: 50
});

module.exports = { model, modelWithTools, agent };