'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OTP extends Model {
    static associate(models) {
      // Belongs to User
      OTP.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  OTP.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      otp_code: {
        type: DataTypes.STRING(6),
        allowNull: false,
        validate: {
          len: [6, 6],
          isNumeric: true,
        },
      },
      type: {
        type: DataTypes.ENUM('email_verification', 'password_reset'),
        allowNull: false,
        defaultValue: 'email_verification',
      },
      is_used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'OTP',
      tableName: 'otps',
      timestamps: true,
      indexes: [
        {
          fields: ['user_id', 'type'],
        },
        {
          fields: ['expires_at'],
        },
        {
          fields: ['otp_code'],
        },
      ],
    }
  );

  return OTP;
};
