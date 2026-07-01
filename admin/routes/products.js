const express = require('express');
const router = express.Router();
const productServices = require('../services/productServices');
const documentServices = require('../services/documentServices');
const multer = require('multer');
const path = require('path');

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

// stub for chunk & embed
router.post('/:id/chunk-embed', ensureAdmin, async (req, res) => {
  // TODO: implement chunking and embeddings with Gemini
  console.log(`Stub: would chunk and embed for product ${req.params.id}`);
  res.redirect(`/admin/products/${req.params.id}/edit`);
});

// delete
router.post('/:id/delete', ensureAdmin, async (req, res) => {
  await productServices.deleteProduct(req.params.id);
  res.redirect('/admin/products');
});

module.exports = router;
