'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Menu extends Model {
    static associate(models) {
      Menu.belongsTo(models.Category, { foreignKey: 'categoryId' });
      Menu.hasMany(models.CartItem, { foreignKey: 'menuId' });
    }
  }
  Menu.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: DataTypes.TEXT,
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      imageUrl: DataTypes.STRING,
      categoryId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Menu',
    }
  );
  return Menu;
};