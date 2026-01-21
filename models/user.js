'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasOne(models.Cart, { foreignKey: 'userId' });
      User.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role',
      });
      User.hasOne(models.Auth, {
        foreignKey: 'user_id',
        as: 'auth',
      });
      User.hasMany(models.UserCoupon, {
        foreignKey: 'user_id',
        as: 'user_coupons',
      });
      User.hasMany(models.OTP, {
        foreignKey: 'user_id',
        as: 'otps',
      });
    }
  }
  User.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Nama tidak boleh kosong',
          },
          len: {
            args: [2, 100],
            msg: 'Nama harus 2-100 karakter',
          },
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: 'Email sudah terdaftar',
        },
        validate: {
          notEmpty: {
            msg: 'Email tidak boleh kosong',
          },
          isEmail: {
            msg: 'Format email tidak valid',
          },
        },
      },
      // HAPUS phone_number di sini
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
        references: {
          model: 'roles',
          key: 'id',
        },
      },
      points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'User',
      timestamps: true,
      // Jika perlu menambahkan default scope untuk mengecualikan phone_number
      defaultScope: {
        attributes: {
          exclude: ['phone_number'], 
        },
      },
    }
  );
  return User;
};
