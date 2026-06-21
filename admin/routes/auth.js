const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../../database');

function ensureAdmin(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  return res.redirect('/admin/login');
}

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.execute('SELECT id, name, email, password, role FROM users WHERE email = ? AND role = "admin" LIMIT 1', [email]);
  const user = rows[0];
  if (!user) {
    return res.status(401).render('login', { error: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).render('login', { error: 'Invalid credentials' });
  }
  req.session.admin = { id: user.id, name: user.name, email: user.email };
  res.redirect('/admin/orders');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

module.exports = router;
