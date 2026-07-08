const documentData = require('../data/documentData');

async function getByProductId(productId) {
  return await documentData.getDocumentByProductId(productId);
}

async function upsert(productId, payload) {
  return await documentData.upsertDocument(productId, payload);
}

async function deleteChunks(documentId) {
  return await documentData.deleteChunksByDocumentId(documentId);
}

async function insertChunk(documentId, chunkText, chunkIndex, embedding) {
  return await documentData.insertChunk(documentId, chunkText, chunkIndex, embedding);
}

async function searchChunks(documentId, queryEmbedding, limit = 5) {
  return await documentData.searchChunkEmbeddings(documentId, queryEmbedding, limit);
}

module.exports = { getByProductId, upsert, deleteChunks, insertChunk, searchChunks };
