const { ChatGoogle } = require('@langchain/google/node');
const { createAgent, todoListMiddleware } = require('langchain');
const { getCompletedOrdersTool, getCompletedOrdersForProductTool, tabulateSalesTool, getLowStockTool } = require('./admin/tools/salesTools.js');
const { generateApexChartTool } = require('./admin/tools/chartTools');
const { searchProductBySemanticTool, answerProductQuestionTool } = require('./admin/tools/ragTools');
const { getProductDetailsTool, createRestockOrderTool, getCurrentDateTimeTool } = require('./admin/tools/planningTools');

const { ChatOpenAI } = require('@langchain/openai');
const { humanInTheLoopMiddleware } = require('langchain');
const { MemorySaver } = require('@langchain/langgraph');

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
  middleware: [todoListMiddleware()]
});

const checkpointer = new MemorySaver();

const openaiModel = new ChatOpenAI({
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY,
});

const hitlAgent = createAgent({
  model: model, // switch to openaiModel for correct hitl behavior
  tools,
  prompt: `You are a helpful admin assistant for an ecommerce store. Format your responses using markdown.

When creating restock orders, process each product ONE AT A TIME:
1. Call create_restock_order for ONE product only
2. Wait for human approval before moving to the next product
Never batch multiple create_restock_order calls together.`,
  middleware: [
    todoListMiddleware(),
    humanInTheLoopMiddleware({
      interruptOn: {
        create_restock_order: {
          allowedDecisions: ['approve', 'reject'],
          description: (toolCall) =>
            `⚠️ **Restock Order Requires Approval**\n\nProduct ID: **${toolCall.args.product_id}**\nAmount: **${toolCall.args.stock_amount}** units\n\nType **yes** to confirm or **no** to reject.`
        }
      }
    })
  ],
  checkpointer,
});

module.exports = { model, modelWithTools, agent, hitlAgent };