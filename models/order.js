'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.hasMany(models.OrderItem, { foreignKey: 'order_id', as: 'items' });
    }
  }
  Order.init(
    {
      no_meja: DataTypes.INTEGER,
      type: DataTypes.ENUM('dine-in', 'take-away'),
      status: DataTypes.ENUM('pending', 'processing', 'done', 'cancelled'),
      payment_type: DataTypes.ENUM('cash', 'midtrans'),
      is_paid: DataTypes.BOOLEAN,
      total_price: DataTypes.INTEGER,
      notes: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'Order',
    }
  );
  return Order;
};
