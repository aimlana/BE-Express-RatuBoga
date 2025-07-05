// routes/index.js
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const menuRoutes = require('./menuRoutes');
const categoryRoutes = require('./categoryRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');

module.exports = {
  '/api/auth': authRoutes,
  '/api/user': userRoutes,
  '/api/menu': menuRoutes,
  '/api/category': categoryRoutes,
  '/api/cart': cartRoutes,
  '/api/order': orderRoutes,
};
