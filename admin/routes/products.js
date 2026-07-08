const express = require('express');
const router = express.Router();
const productServices = require('../services/productServices');
const documentServices = require('../services/documentServices');
const { extractTextFromPDF, chunkText, generateEmbedding } = require('../services/embeddingServices');
const multer = require('multer');
const path = require('path');

const { ChatGoogle } = require('@langchain/google/node');
const { model } = require('../../gemini');
const { z } = require('zod');

const modelWithSearch = new ChatGoogle({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY,
}).bindTools([
  {
    googleSearchRetrieval: {}
  }
]);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `product_${req.params.id || 'new'}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

function ensureAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect('/admin/login');
}

// list
router.get('/', ensureAdmin, async (req, res) => {
  const products = await productServices.getAllProducts();
  res.render('products/index', { admin: req.session.admin, products });
});

// new form
router.get('/new', ensureAdmin, (req, res) => {
  Promise.all([
    productServices.getAllCategories(),
    productServices.getAllTags()
  ]).then(([categories, tags]) => {
    res.render('products/new', { admin: req.session.admin, errors: null, categories, tags });
  }).catch(() => res.status(500).send('Error'));
});

// create
router.post('/', ensureAdmin, upload.single('pdf'), async (req, res) => {
  const { category_id, name, brand, price, imageUrl, description, stock } = req.body;
  const tagIds = Array.isArray(req.body['tags[]']) ? req.body['tags[]'] : (req.body['tags[]'] ? [req.body['tags[]']] : []);
  const productId = await productServices.createProduct({ category_id, name, brand, price, imageUrl, description, stock });
  if (req.file) {
    await documentServices.upsert(productId, { file_path: `/uploads/${req.file.filename}`, content: null });
  }
  await productServices.setProductTags(productId, tagIds.map(Number));
  res.redirect('/admin/products');
});

// generate product listing from natural language
router.post('/ai/generate', ensureAdmin, express.json(), async (req, res) => {
  try {
    const { message } = req.body;
    const categories = await productServices.getAllCategories();
    const tags = await productServices.getAllTags();

    const productSchema = z.object({
      name: z.string(),
      brand: z.string(),
      price: z.number(),
      description: z.string(),
      category_id: z.number().describe(`Must be one of: ${categories.map(c => `${c.id} (${c.name})`).join(', ')}`),
      tag_ids: z.array(z.number()).describe(`Must be from: ${tags.map(t => `${t.id} (${t.name})`).join(', ')}`)
    });

    const structuredModel = model.withStructuredOutput(productSchema);

    const response = await structuredModel.invoke(
      `Generate a product listing from this description: ${message}`
    );

    res.json(response);
  } catch (error) {
    console.error('AI product generation error:', error);
    res.status(500).json({ error: 'Failed to generate product listing' });
  }
});

// generate ai summary of online reviews
router.get('/:id/reviews', ensureAdmin, async (req, res) => {
  try {
    const product = await productServices.getProductById(req.params.id);
    
    const response = await modelWithSearch.invoke(
      `Search for customer reviews of "${product.name}" by "${product.brand}". 
       Summarize what customers are saying about this product in 3-4 sentences.
       Focus on common praise, complaints, and overall sentiment.`
    );

    res.json({ summary: response.content });
  } catch (error) {
    console.error('AI reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// edit form
router.get('/:id/edit', ensureAdmin, async (req, res) => {
  const [product, categories, tags, selected, doc] = await Promise.all([
    productServices.getProductById(req.params.id),
    productServices.getAllCategories(),
    productServices.getAllTags(),
    productServices.getProductTags(req.params.id),
    documentServices.getByProductId(req.params.id)
  ]);
  const selectedTagIds = new Set(selected.map(t => t.id));
  res.render('products/edit', { admin: req.session.admin, product, categories, tags, selectedTagIds, document: doc, errors: null });
});

// update
router.post('/:id', ensureAdmin, async (req, res) => {
  const { category_id, name, brand, price, imageUrl, description, stock } = req.body;
  const tagIds = Array.isArray(req.body['tags[]']) ? req.body['tags[]'] : (req.body['tags[]'] ? [req.body['tags[]']] : []);
  await productServices.updateProduct(req.params.id, { category_id, name, brand, price, imageUrl, description, stock });
  await productServices.setProductTags(Number(req.params.id), tagIds.map(Number));
  res.redirect('/admin/products');
});

// upload PDF for product document
router.post('/:id/upload', ensureAdmin, upload.single('pdf'), async (req, res) => {
  await documentServices.upsert(req.params.id, { file_path: `/uploads/${req.file.filename}`, content: null });
  res.redirect(`/admin/products/${req.params.id}/edit`);
});

// chunk & embed pdf
router.post('/:id/chunk-embed', ensureAdmin, async (req, res) => {
  try {
    const doc = await documentServices.getByProductId(req.params.id);
    if (!doc || !doc.file_path) {
      return res.status(400).send('No PDF uploaded for this product');
    }

    // extract text from PDF
    const text = await extractTextFromPDF(doc.file_path);

    // chunk the text
    const chunks = chunkText(text);

    // delete existing chunks
    await documentServices.deleteChunks(doc.id);

    // generate embeddings and insert chunks
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      await documentServices.insertChunk(doc.id, chunks[i], i, embedding);
    }

    console.log(`Chunked and embedded ${chunks.length} chunks for product ${req.params.id}`);
    res.redirect(`/admin/products/${req.params.id}/edit`);
  } catch (error) {
    console.error('Chunk and embed error:', error);
    res.status(500).send('Error processing PDF');
  }
});

// delete
router.post('/:id/delete', ensureAdmin, async (req, res) => {
  await productServices.deleteProduct(req.params.id);
  res.redirect('/admin/products');
});

// view
router.get('/:id/view', ensureAdmin, async (req, res) => {
  const [product, reviews, document] = await Promise.all([
    productServices.getProductById(req.params.id),
    productServices.getReviewsByProductId(req.params.id),
    documentServices.getByProductId(req.params.id)
  ]);
  if (document) product.file_path = document.file_path;
  res.render('products/view', { admin: req.session.admin, product, reviews });
});

// process reviews - generate embeddings
router.post('/:id/process-reviews', ensureAdmin, async (req, res) => {
  try {
    const reviews = await productServices.getReviewsByProductId(req.params.id);
    if (reviews.length === 0) {
      return res.redirect(`/admin/products/${req.params.id}/view`);
    }

    for (const review of reviews) {
      const text = `${review.title}. ${review.review_text}`;
      const embedding = await generateEmbedding(text);
      await productServices.updateReviewEmbedding(review.id, embedding);
    }

    console.log(`Processed embeddings for ${reviews.length} reviews for product ${req.params.id}`);
    res.redirect(`/admin/products/${req.params.id}/view`);
  } catch (error) {
    console.error('Process reviews error:', error);
    res.status(500).send('Error processing reviews');
  }
});

// analyse sentiments
router.get('/:id/analyse-sentiments', ensureAdmin, async (req, res) => {
  try {
    const product = await productServices.getProductById(req.params.id);

    // use a broad query to retrieve relevant review chunks
    const queryEmbedding = await generateEmbedding('product quality customer satisfaction experience');
    const relevantReviews = await productServices.searchReviewEmbeddings(req.params.id, queryEmbedding);

    if (relevantReviews.length === 0) {
      return res.json({ sentiment: 'No processed reviews found. Please process reviews first.' });
    }

    const reviewContext = relevantReviews.map(r =>
      `Rating: ${r.rating}/5 - ${r.title}: ${r.review_text}`
    ).join('\n\n');

    const prompt = `You are a product sentiment analyst. Analyse the following customer reviews for ${product.name} and provide a concise sentiment summary.

Reviews:
${reviewContext}

Provide:
1. Overall sentiment (Positive/Negative/Mixed)
2. Key themes customers praise
3. Key themes customers criticize
4. Overall recommendation

Format your response in markdown.`;

    const response = await model.invoke(prompt);
    res.json({ sentiment: response.content });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ sentiment: 'Error analysing sentiments.' });
  }
});

module.exports = router;
