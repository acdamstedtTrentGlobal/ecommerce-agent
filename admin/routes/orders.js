const express = require('express');
const router = express.Router();
const orderServices = require('../services/orderServices');

function ensureAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect('/admin/login');
}

router.get('/', ensureAdmin, async (req, res) => {
  const rows = await orderServices.listOrders();
  res.render('orders', { admin: req.session.admin, orders: rows });
});

module.exports = router;
