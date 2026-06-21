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

module.exports = { listOrders };
