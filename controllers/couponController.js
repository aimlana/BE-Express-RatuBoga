const { Coupon, UserCoupon, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get all coupons (with pagination and filters)
const getAllCoupons = async (req, res) => {
  const { page = 1, limit = 10, search, is_active } = req.query;
  const offset = (page - 1) * limit;

  try {
    const whereClause = {};

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const { count, rows: coupons } = await Coupon.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data kupon',
      data: coupons,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kupon',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

// Get coupon by ID
const getCouponById = async (req, res) => {
  const { id } = req.params;

  try {
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Kupon tidak ditemukan',
      });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    console.error('Get coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kupon',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

// Create new coupon
const createCoupon = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      name,
      description,
      points_required,
      discount_type,
      discount_value,
      valid_until,
      max_usage,
    } = req.body;

    // Validasi kupon
    if (!name || !points_required || !discount_type || !discount_value) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          'Nama, poin required, tipe diskon, dan nilai diskon wajib diisi',
      });
    }

    if (
      discount_type === 'percentage' &&
      (discount_value < 1 || discount_value > 100)
    ) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Diskon persentase harus antara 1-100%',
      });
    }

    if (discount_type === 'fixed' && discount_value < 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Diskon fixed harus lebih dari 0',
      });
    }

    const coupon = await Coupon.create(
      {
        name,
        description: description || null,
        points_required: parseInt(points_required),
        discount_type,
        discount_value: parseInt(discount_value),
        valid_until: valid_until ? new Date(valid_until) : null,
        max_usage: max_usage ? parseInt(max_usage) : null,
        is_active: true,
        current_usage: 0,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Kupon berhasil dibuat',
      data: coupon,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create coupon error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: error.errors.map((err) => err.message),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal membuat kupon',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

// Update coupon
const updateCoupon = async (req, res) => {
  const { id } = req.params;
  const transaction = await sequelize.transaction();

  try {
    const coupon = await Coupon.findByPk(id, { transaction });

    if (!coupon) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Kupon tidak ditemukan',
      });
    }

    const {
      name,
      description,
      points_required,
      discount_type,
      discount_value,
      valid_until,
      max_usage,
      is_active,
    } = req.body;

    // Validasi
    if (
      discount_type === 'percentage' &&
      (discount_value < 1 || discount_value > 100)
    ) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Diskon persentase harus antara 1-100%',
      });
    }

    if (discount_type === 'fixed' && discount_value < 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Diskon fixed harus lebih dari 0',
      });
    }

    await coupon.update(
      {
        name: name || coupon.name,
        description:
          description !== undefined ? description : coupon.description,
        points_required: points_required
          ? parseInt(points_required)
          : coupon.points_required,
        discount_type: discount_type || coupon.discount_type,
        discount_value: discount_value
          ? parseInt(discount_value)
          : coupon.discount_value,
        valid_until:
          valid_until !== undefined
            ? valid_until
              ? new Date(valid_until)
              : null
            : coupon.valid_until,
        max_usage:
          max_usage !== undefined
            ? max_usage
              ? parseInt(max_usage)
              : null
            : coupon.max_usage,
        is_active: is_active !== undefined ? is_active : coupon.is_active,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Kupon berhasil diperbarui',
      data: coupon,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update coupon error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: error.errors.map((err) => err.message),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui kupon',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

// Delete coupon
const deleteCoupon = async (req, res) => {
  const { id } = req.params;
  const transaction = await sequelize.transaction();

  try {
    const coupon = await Coupon.findByPk(id, { transaction });

    if (!coupon) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Kupon tidak ditemukan',
      });
    }

    // Check if coupon has been used
    const usedCoupons = await UserCoupon.count({
      where: { coupon_id: id, is_used: true },
      transaction,
    });

    if (usedCoupons > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus kupon yang sudah digunakan',
      });
    }

    // Delete user coupons associated with this coupon
    await UserCoupon.destroy({
      where: { coupon_id: id },
      transaction,
    });

    await coupon.destroy({ transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Kupon berhasil dihapus',
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus kupon',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

// Get coupon usage statistics
const getCouponStats = async (req, res) => {
  try {
    const totalCoupons = await Coupon.count();
    const activeCoupons = await Coupon.count({ where: { is_active: true } });

    const totalRedeemed = await UserCoupon.count({ where: { is_used: true } });
    const totalAvailable = await UserCoupon.count({
      where: { is_used: false },
    });

    const popularCoupons = await Coupon.findAll({
      include: [
        {
          association: 'user_coupons',
          attributes: [],
        },
      ],
      attributes: [
        'id',
        'name',
        [
          sequelize.fn('COUNT', sequelize.col('user_coupons.id')),
          'usage_count',
        ],
      ],
      group: ['Coupon.id'],
      order: [[sequelize.literal('usage_count'), 'DESC']],
      limit: 5,
    });

    res.status(200).json({
      success: true,
      data: {
        total_coupons: totalCoupons,
        active_coupons: activeCoupons,
        total_redeemed: totalRedeemed,
        total_available: totalAvailable,
        popular_coupons: popularCoupons,
      },
    });
  } catch (error) {
    console.error('Get coupon stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik kupon',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

module.exports = {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponStats,
};
