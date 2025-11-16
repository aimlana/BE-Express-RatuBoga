'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserCoupon extends Model {
    static associate(models) {
      UserCoupon.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      UserCoupon.belongsTo(models.Coupon, {
        foreignKey: 'coupon_id',
        as: 'coupon',
      });
    }
  }
  UserCoupon.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      coupon_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Coupons',
          key: 'id',
        },
      },
      is_used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      acquired_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'UserCoupon',
    }
  );
  return UserCoupon;
};