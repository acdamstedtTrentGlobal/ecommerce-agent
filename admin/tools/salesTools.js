const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const orderServices = require('../services/orderServices');

const getCompletedOrdersTool = tool(
  async ({ startDate, endDate }) => {
    const orders = await orderServices.getCompletedOrdersByDateRange(startDate, endDate);
    if (orders.length === 0) return 'No completed orders found in that date range.';
    return JSON.stringify(orders);
  },
  {
    name: 'get_completed_orders',
    description: 'Get all completed orders within a date range across all products',
    schema: z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
    }),
  }
);

const getCompletedOrdersForProductTool = tool(
  async ({ startDate, endDate, productId }) => {
    const orders = await orderServices.getCompletedOrdersByDateRangeForProduct(startDate, endDate, productId);
    if (orders.length === 0) return 'No completed orders found for that product in that date range.';
    return JSON.stringify(orders);
  },
  {
    name: 'get_completed_orders_for_product',
    description: 'Get all completed orders within a date range for a specific product',
    schema: z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
      productId: z.number().describe('The ID of the product'),
    }),
  }
);

const tabulateSalesTool = tool(
  async ({ startDate, endDate }) => {
    const sales = await orderServices.tabulateSales(startDate, endDate);
    return JSON.stringify(sales);
  },
  {
    name: 'tabulate_sales',
    description: 'Get total revenue and units sold broken down by product for a date range',
    schema: z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
    }),
  }
);

const getLowStockTool = tool(
  async ({ threshold }) => {
    const products = await orderServices.getLowStockProducts(threshold);
    if (products.length === 0) return `No products with stock at or below ${threshold}.`;
    return JSON.stringify(products);
  },
  {
    name: 'get_low_stock_products',
    description: 'Find all products where stock is at or below a given threshold',
    schema: z.object({
      threshold: z.number().describe('Stock threshold — returns products at or below this number'),
    }),
  }
);

module.exports = {
  getCompletedOrdersTool,
  getCompletedOrdersForProductTool,
  tabulateSalesTool,
  getLowStockTool
};