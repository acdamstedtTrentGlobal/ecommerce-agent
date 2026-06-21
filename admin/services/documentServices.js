const documentData = require('../data/documentData');

async function getByProductId(productId) {
  return await documentData.getDocumentByProductId(productId);
}

async function upsert(productId, payload) {
  return await documentData.upsertDocument(productId, payload);
}

module.exports = { getByProductId, upsert };
