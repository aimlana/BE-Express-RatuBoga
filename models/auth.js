'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Auth extends Model {
    static associate(models) {
      Auth.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }
  Auth.init({
    user_id: DataTypes.INTEGER,
    password: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Auth',
    timestamps: true,
  });
  return Auth;
};