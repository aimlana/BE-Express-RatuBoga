// routes/index.js
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const menuRoutes = require('./menuRoutes');
const categoryRoutes = require('./categoryRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const tableRoutes = require('./tableRoutes');
const profileRoutes = require('./profileRoutes');
const couponRoutes = require('./couponRoutes');
const pointRoutes = require('./pointRoutes');
const userOrderRoutes = require('./userOrderRoutes');
const adminPointRoutes = require('./adminPointRoutes');

module.exports = {
  '/api/auth': authRoutes,
  '/api/user': userRoutes,
  '/api/menu': menuRoutes,
  '/api/category': categoryRoutes,
  '/api/cart': cartRoutes,
  '/api/order': orderRoutes,
  '/api/payment': paymentRoutes,
  '/api/tables': tableRoutes,
  '/api/profile': profileRoutes,
  '/api/admin/coupons': couponRoutes,
  '/api/user/points': pointRoutes,
  '/api/user/orders': userOrderRoutes,
  '/api/admin/points': adminPointRoutes,
};
