'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CartItem extends Model {
    static associate(models) {
      CartItem.belongsTo(models.Cart, { foreignKey: 'cartId' });
      CartItem.belongsTo(models.Menu, { foreignKey: 'menuId' });
    }
  }
  CartItem.init(
    {
      cartId: DataTypes.INTEGER,
      menuId: DataTypes.INTEGER,
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      notes: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'CartItem',
    }
  );
  return CartItem;
};