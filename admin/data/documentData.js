const pool = require('../../database');

async function getDocumentByProductId(productId) {
  const [rows] = await pool.execute(`SELECT * FROM documents WHERE product_id = ?`, [productId]);
  return rows[0];
}

async function upsertDocument(productId, { file_path, content = null }) {
  const existing = await getDocumentByProductId(productId);
  if (existing) {
    await pool.execute(`UPDATE documents SET file_path = ?, content = ? WHERE id = ?`, [file_path, content, existing.id]);
    return existing.id;
  }
  const [r] = await pool.execute(`INSERT INTO documents (product_id, file_path, content) VALUES (?, ?, ?)`, [productId, file_path, content]);
  return r.insertId;
}

module.exports = { getDocumentByProductId, upsertDocument };
