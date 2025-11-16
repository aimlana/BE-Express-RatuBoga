'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Coupon extends Model {
    static associate(models) {
      Coupon.hasMany(models.UserCoupon, {
        foreignKey: 'coupon_id',
        as: 'user_coupons',
      });
    }
  }
  Coupon.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      points_required: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      discount_type: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'fixed',
      },
      discount_value: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      valid_until: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      max_usage: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      current_usage: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'Coupon',
      tableName: 'coupons',
    }
  );
  return Coupon;
};