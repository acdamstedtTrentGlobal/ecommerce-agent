const { ChatGoogle } = require('@langchain/google/node');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { getCompletedOrdersTool, getCompletedOrdersForProductTool, tabulateSalesTool, getLowStockTool } = require('./admin/tools/salesTools.js');
const { generateApexChartTool } = require('./admin/tools/chartTools');
const { searchProductBySemanticTool, answerProductQuestionTool } = require('./admin/tools/ragTools');

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
  answerProductQuestionTool
];

const modelWithTools = new ChatGoogle({
    model: 'gemini-3.1-flash-lite',
    apiKey: process.env.GEMINI_API_KEY,
}).bindTools(tools);

const agent = createReactAgent({
  llm: model,
  tools,
  messageModifier: 'You are a helpful admin assistant for an ecommerce store. Format your responses using markdown. When you generate a chart using the generate_apex_chart tool, do NOT include any chart URLs or image links in your text response — the chart will be rendered automatically by the frontend.',
});

module.exports = { model, modelWithTools, agent };