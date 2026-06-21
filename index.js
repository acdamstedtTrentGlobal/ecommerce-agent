const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const pool = require("./database");

const app = express();

// Middleware

app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'admin', 'views'));
app.use(express.urlencoded({ extended: true }));
// static assets
app.use(express.static(path.join(__dirname, 'public')));
// ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple in-memory session for admin auth
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  createDatabaseTable: true
});
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
}));

// require in the routes
const productRouter = require("./routes/products");
const userRouter = require("./routes/users");
const cartRouter = require('./routes/cart');
const checkoutRouter = require('./routes/checkout');
const stripeRouter = require('./routes/stripe');
// admin routers
const adminAuthRouter = require('./admin/routes/auth');
const adminOrdersRouter = require('./admin/routes/orders');
const adminProductsRouter = require('./admin/routes/products');
const adminChatRouter = require('./admin/routes/chat');

// register the router
app.use('/api/products', [express.json()], productRouter);
app.use('/api/users', [express.json()], userRouter);
app.use('/api/cart', [express.json()], cartRouter);
app.use('/api/checkout', [express.json()], checkoutRouter);
app.use('/api/stripe', stripeRouter);

// admin domain
app.use('/admin', adminAuthRouter);
app.use('/admin/orders', adminOrdersRouter);
app.use('/admin/products', adminProductsRouter);
app.use('/admin/chat', adminChatRouter);


// Routes
app.get('/', (req, res) => {
  res.json({ message: "Welcome to the API" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});