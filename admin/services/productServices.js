const productData = require('../data/productData');

async function getAllProducts() {
  return await productData.getAllProducts();
}

async function getProductById(id) {
  return await productData.getProductById(id);
}

async function createProduct(payload) {
  return await productData.createProduct(payload);
}

async function updateProduct(id, payload) {
  return await productData.updateProduct(id, payload);
}

async function deleteProduct(id) {
  return await productData.deleteProduct(id);
}

async function getAllCategories() {
  return await productData.getAllCategories();
}

async function getAllTags() {
  return await productData.getAllTags();
}

async function getProductTags(id) {
  return await productData.getProductTags(id);
}

async function setProductTags(id, tagIds) {
  return await productData.setProductTags(id, tagIds);
}

async function getReviewsByProductId(productId) {
  return await productData.getReviewsByProductId(productId);
}

async function getReviewById(reviewId) {
  return await productData.getReviewById(reviewId);
}

async function updateReviewEmbedding(reviewId, embedding) {
  return await productData.updateReviewEmbedding(reviewId, embedding);
}

async function searchReviewEmbeddings(productId, queryEmbedding, limit = 10) {
  return await productData.searchReviewEmbeddings(productId, queryEmbedding, limit);
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
  setProductTags,
  getReviewsByProductId,
  getReviewById,
  updateReviewEmbedding,
  searchReviewEmbeddings
};
