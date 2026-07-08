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

async function deleteChunksByDocumentId(documentId) {
  await pool.execute(`DELETE FROM document_chunks WHERE document_id = ?`, [documentId]);
}

async function insertChunk(documentId, chunkText, chunkIndex, embedding) {
  const vectorString = `[${embedding.join(',')}]`;
  await pool.execute(
    `INSERT INTO document_chunks (document_id, chunk_text, chunk_index, embedding) VALUES (?, ?, ?, VEC_FromText('${vectorString}'))`,
    [documentId, chunkText, chunkIndex]
  );
}

async function searchChunkEmbeddings(documentId, queryEmbedding, limit = 5) {
  const vectorString = `[${queryEmbedding.join(',')}]`;
  const [rows] = await pool.execute(
    `SELECT chunk_text, VEC_DISTANCE(embedding, VEC_FromText('${vectorString}')) as distance
     FROM document_chunks
     WHERE document_id = ?
     ORDER BY distance ASC
     LIMIT ?`,
    [documentId, limit]
  );
  return rows;
}

module.exports = { getDocumentByProductId, upsertDocument, deleteChunksByDocumentId, insertChunk, searchChunkEmbeddings };
