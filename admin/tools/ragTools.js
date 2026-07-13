const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { generateEmbedding } = require('../services/embeddingServices');
const pool = require('../../database');

const searchProductBySemanticTool = tool(
  async ({ terms }) => {
    try {
      const queryEmbedding = await generateEmbedding(terms);
      const vectorString = `[${queryEmbedding.join(',')}]`;

      const [rows] = await pool.execute(
        `SELECT p.id as product_id, p.name as product_name, p.brand,
                dc.chunk_text,
                VEC_DISTANCE(dc.embedding, VEC_FromText('${vectorString}')) as distance
         FROM document_chunks dc
         JOIN documents d ON dc.document_id = d.id
         JOIN products p ON d.product_id = p.id
         ORDER BY distance ASC
         LIMIT 5`,
      );

      if (rows.length === 0) {
        return 'No matching products found in the knowledge base.';
      }

      const results = rows.map(r =>
        `Product ID: ${r.product_id} - ${r.product_name} (${r.brand})\nRelevant text: ${r.chunk_text.substring(0, 200)}...`
      ).join('\n\n');

      return results;
    } catch (error) {
      console.error('searchProductBySemantic error:', error);
      return 'Error searching product knowledge base.';
    }
  },
  {
    name: 'search_product_by_semantic',
    description: 'Search for products by semantic similarity using natural language terms. Use this to find which product the user is asking about when they describe it in natural language. Returns matching product IDs and relevant text excerpts.',
    schema: z.object({
      terms: z.string().describe('Natural language search terms describing the product or topic to search for'),
    }),
  }
);

const answerProductQuestionTool = tool(
  async ({ product_id, question }) => {
    try {
      const queryEmbedding = await generateEmbedding(question);
      const vectorString = `[${queryEmbedding.join(',')}]`;

      // get document for product
      const [docs] = await pool.execute(
        `SELECT d.id FROM documents d WHERE d.product_id = ?`,
        [product_id]
      );

      if (docs.length === 0) {
        return `No product documentation found for product ID ${product_id}. The product may not have a PDF uploaded yet.`;
      }

      const documentId = docs[0].id;

      // vector search on chunks
      const [chunks] = await pool.execute(
        `SELECT chunk_text,
                VEC_DISTANCE(embedding, VEC_FromText('${vectorString}')) as distance
         FROM document_chunks
         WHERE document_id = ?
         ORDER BY distance ASC
         LIMIT 5`,
        [documentId]
      );

      if (chunks.length === 0) {
        return `No relevant chunks found. The PDF may not have been chunked and embedded yet.`;
      }

      const context = chunks.map(c => c.chunk_text).join('\n\n');

      return `Relevant product documentation for question "${question}":\n\n${context}`;
    } catch (error) {
      console.error('answerProductQuestion error:', error);
      return 'Error retrieving product documentation.';
    }
  },
  {
    name: 'answer_product_question',
    description: 'Answer a specific question about a product using its uploaded PDF documentation. Use this after identifying the product ID with search_product_by_semantic. Returns relevant text from the product documentation that can be used to answer the question.',
    schema: z.object({
      product_id: z.number().describe('The ID of the product to search documentation for'),
      question: z.string().describe('The specific question to answer about the product'),
    }),
  }
);

module.exports = { searchProductBySemanticTool, answerProductQuestionTool };