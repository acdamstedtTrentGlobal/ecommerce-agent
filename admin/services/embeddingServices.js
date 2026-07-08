const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'gemini-embedding-2',
  apiKey: process.env.GEMINI_API_KEY,
});

async function extractTextFromPDF(filePath) {
    const absolutePath = path.join(process.cwd(), filePath);
    const dataBuffer = fs.readFileSync(absolutePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
}

function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

async function generateEmbedding(text) {
  const result = await embeddings.embedQuery(text);
  return result;
}

module.exports = { extractTextFromPDF, chunkText, generateEmbedding };