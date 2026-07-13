const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const pool = require('../../database');

const getProductDetailsTool = tool(
  async ({ product_id }) => {
    try {
      const [products] = await pool.execute(
        `SELECT p.id, p.name, p.brand, CAST(p.price AS DOUBLE) AS price, 
                p.description, p.stock, c.name AS category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`,
        [product_id]
      );

      if (products.length === 0) {
        return `No product found with ID ${product_id}.`;
      }

      const product = products[0];

      const [reviews] = await pool.execute(
        `SELECT title, review_text, rating, review_date
         FROM reviews
         WHERE product_id = ?
         ORDER BY review_date DESC`,
        [product_id]
      );

      const reviewText = reviews.length > 0
        ? reviews.map(r => `- [${r.rating}/5] ${r.title}: ${r.review_text}`).join('\n')
        : 'No reviews yet.';

      return JSON.stringify({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        category: product.category_name,
        stock: product.stock,
        description: product.description,
        reviews: reviewText
      });
    } catch (error) {
      console.error('getProductDetails error:', error);
      return 'Error retrieving product details.';
    }
  },
  {
    name: 'get_product_details',
    description: 'Get full details of a product including its description, price, stock level, category, and customer reviews. Use this when you need comprehensive information about a specific product.',
    schema: z.object({
      product_id: z.number().describe('The ID of the product to retrieve details for'),
    }),
  }
);

const createRestockOrderTool = tool(
  async ({ product_id, stock_amount }) => {
    try {
      const [products] = await pool.execute(
        `SELECT id, name, brand, stock FROM products WHERE id = ?`,
        [product_id]
      );

      if (products.length === 0) {
        return `No product found with ID ${product_id}.`;
      }

      const product = products[0];

      // client-side only - no real DB changes
      const restockOrder = {
        order_id: `RESTOCK-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        brand: product.brand,
        current_stock: product.stock,
        restock_amount: stock_amount,
        projected_stock: product.stock + stock_amount,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      console.log(`📦 [RESTOCK ORDER CREATED]`, JSON.stringify(restockOrder, null, 2));

      return JSON.stringify({
        success: true,
        message: `Restock order created for ${product.name} (${product.brand})`,
        order: restockOrder
      });
    } catch (error) {
      console.error('createRestockOrder error:', error);
      return 'Error creating restock order.';
    }
  },
  {
    name: 'create_restock_order',
    description: 'Create a restock order for a product to replenish its inventory. This is a client-side simulation and does not make real changes to the database. Use this when stock levels are low and restocking is needed.',
    schema: z.object({
      product_id: z.number().describe('The ID of the product to restock'),
      stock_amount: z.number().describe('The amount of stock to order'),
    }),
  }
);

const getCurrentDateTimeTool = tool(
  async () => {
    const now = new Date();
    return JSON.stringify({
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      datetime: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  },
  {
    name: 'get_current_datetime',
    description: 'Get the current date and time. Use this when you need to know today\'s date for queries, reports, or any time-sensitive operations.',
    schema: z.object({})
  }
);

module.exports = { getProductDetailsTool, createRestockOrderTool, getCurrentDateTimeTool };