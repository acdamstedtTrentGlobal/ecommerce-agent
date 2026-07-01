const pool = require('../../database');

async function getAllProducts() {
  const [rows] = await pool.execute(
    `SELECT p.id, p.name, p.brand, CAST(p.price AS DOUBLE) AS price, p.imageUrl, p.description, p.stock,
            p.category_id, c.name AS category_name
     FROM products p
     JOIN categories c ON p.category_id = c.id`
  );
  return rows;
}

async function getProductById(id) {
  const [rows] = await pool.execute(
    `SELECT id, name, brand, CAST(price AS DOUBLE) AS price, imageUrl, description, stock, category_id
     FROM products WHERE id = ?`,
    [id]
  );
  return rows[0];
}

async function createProduct({ category_id, name, brand, price, imageUrl, description, stock }) {
  const [r] = await pool.execute(
    `INSERT INTO products (category_id, name, brand, price, imageUrl, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [category_id, name, brand, price, imageUrl, description, stock]
  );
  return r.insertId;
}

async function updateProduct(id, { category_id, name, brand, price, imageUrl, description, stock }) {
  await pool.execute(
    `UPDATE products SET category_id = ?, name = ?, brand = ?, price = ?, imageUrl = ?, description = ?, stock = ? WHERE id = ?`,
    [category_id, name, brand, price, imageUrl, description, stock, id]
  );
}

async function deleteProduct(id) {
  await pool.execute(`DELETE FROM products WHERE id = ?`, [id]);
}

async function getAllCategories() {
  const [rows] = await pool.execute(`SELECT id, name FROM categories ORDER BY name`);
  return rows;
}

async function getAllTags() {
  const [rows] = await pool.execute(`SELECT id, name FROM tags ORDER BY name`);
  return rows;
}

async function getProductTags(productId) {
  const [rows] = await pool.execute(
    `SELECT t.id, t.name FROM product_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.product_id = ? ORDER BY t.name`,
    [productId]
  );
  return rows;
}

async function setProductTags(productId, tagIds) {
  await pool.execute(`DELETE FROM product_tags WHERE product_id = ?`, [productId]);
  if (!tagIds || tagIds.length === 0) return;
  const values = tagIds.map(id => [productId, id]);
  await pool.query(`INSERT INTO product_tags (product_id, tag_id) VALUES ?`, [values]);
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
  getAllTags,
  getProductTags,
  setProductTags
};
