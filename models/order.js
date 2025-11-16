'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.hasMany(models.OrderItem, { foreignKey: 'order_id', as: 'items' });
      Order.hasOne(models.Payment, {
        foreignKey: 'order_id',
        as: 'payment',
        onDelete: 'CASCADE',
        hooks: true,
      });
      Order.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      Order.belongsTo(models.Table, {
        foreignKey: 'table_id',
        as: 'table',
      });
    }
  }
  Order.init(
    {
      table_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Tables',
          key: 'id',
        },
      },
      type: DataTypes.ENUM('dine-in', 'take-away'),
      status: DataTypes.ENUM('pending', 'processing', 'done', 'cancelled'),
      payment_type: {
        type: DataTypes.ENUM('cash'),
        allowNull: false,
        defaultValue: 'cash',
      },
      is_paid: DataTypes.BOOLEAN,
      total_price: DataTypes.INTEGER,
      notes: DataTypes.TEXT,
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      original_price: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      discount_amount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      coupon_used: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      points_awarded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      points_earned: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'Order',
    }
  );
  return Order;
};
