const pool = require('../../database');

async function listOrders() {
  const [rows] = await pool.execute(`
    SELECT o.id, o.total, o.status, o.created_at,
           u.name AS user_name, u.email AS user_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `);
  return rows;
}

async function getCompletedOrdersByDateRange(startDate, endDate) {
  const [rows] = await pool.execute(`
    SELECT o.id, o.total, o.status, o.created_at,
           u.name AS user_name, u.email AS user_email,
           p.name AS product_name, oi.quantity
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status = 'completed'
    AND o.created_at BETWEEN ? AND ?
    ORDER BY o.created_at DESC
  `, [startDate, endDate]);
  return rows;
}

async function getCompletedOrdersByDateRangeForProduct(startDate, endDate, productId) {
  const [rows] = await pool.execute(`
    SELECT o.id, o.total, o.status, o.created_at,
           u.name AS user_name, u.email AS user_email,
           p.name AS product_name, oi.quantity
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status = 'completed'
    AND o.created_at BETWEEN ? AND ?
    AND p.id = ?
    ORDER BY o.created_at DESC
  `, [startDate, endDate, productId]);
  return rows;
}

async function tabulateSales(startDate, endDate) {
  const [overall] = await pool.execute(`
    SELECT 
      COUNT(DISTINCT o.id) AS total_orders,
      SUM(o.total) AS total_revenue
    FROM orders o
    WHERE o.status = 'completed'
    AND o.created_at BETWEEN ? AND ?
  `, [startDate, endDate]);

  const [byProduct] = await pool.execute(`
    SELECT 
      p.name AS product_name,
      SUM(oi.quantity) AS units_sold,
      SUM(oi.quantity * p.price) AS revenue
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status = 'completed'
    AND o.created_at BETWEEN ? AND ?
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
  `, [startDate, endDate]);

  return { overall: overall[0], byProduct };
}

async function getLowStockProducts(threshold) {
  const [rows] = await pool.execute(`
    SELECT id, name, brand, stock
    FROM products
    WHERE stock <= ?
    ORDER BY stock ASC
  `, [Number(threshold)]);
  return rows;
}

module.exports = { 
  listOrders,
  getCompletedOrdersByDateRange,
  getCompletedOrdersByDateRangeForProduct,
  tabulateSales,
  getLowStockProducts
};
