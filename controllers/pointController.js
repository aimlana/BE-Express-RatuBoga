const { User, UserCoupon, Coupon, Order, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get user points and history
const getUserPoints = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'points'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan',
      });
    }

    // Get recent orders that earned points (completed orders)
    const pointHistory = await Order.findAll({
      where: {
        user_id: req.user.id,
        status: 'done',
        is_paid: true,
        total_price: { [Op.gt]: 0 }, // Only orders with positive amount
      },
      attributes: ['id', 'total_price', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    // Calculate points from orders (1 point per 10,000 IDR)
    const pointHistoryWithDetails = pointHistory.map((order) => ({
      id: order.id,
      type: 'order_earned',
      description: `Pembelian #${order.id}`,
      points: Math.floor(order.total_price / 10000),
      amount: order.total_price,
      date: order.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        total_points: user.points,
        point_history: pointHistoryWithDetails,
      },
    });
  } catch (error) {
    console.error('Get user points error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data poin',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

// Redeem points for coupon
const redeemPointsForCoupon = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { coupon_id } = req.body;

    if (!coupon_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'ID kupon wajib diisi',
      });
    }

    const user = await User.findByPk(req.user.id, { transaction });
    const coupon = await Coupon.findByPk(coupon_id, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan',
      });
    }

    if (!coupon) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Kupon tidak ditemukan',
      });
    }

    // Check if coupon is active
    if (!coupon.is_active) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Kupon tidak aktif',
      });
    }

    // Check if coupon has expired
    if (coupon.valid_until && new Date() > new Date(coupon.valid_until)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Kupon sudah kadaluarsa',
      });
    }

    // Check if user has enough points
    if (user.points < coupon.points_required) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Poin tidak cukup. Dibutuhkan: ${coupon.points_required}, Poin Anda: ${user.points}`,
      });
    }

    // Check if coupon has usage limit
    if (coupon.max_usage && coupon.current_usage >= coupon.max_usage) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Kupon sudah mencapai batas penggunaan',
      });
    }

    // Check if user already has this coupon and hasn't used it
    const existingUserCoupon = await UserCoupon.findOne({
      where: {
        user_id: user.id,
        coupon_id: coupon.id,
        is_used: false,
      },
      transaction,
    });

    if (existingUserCoupon) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Anda sudah memiliki kupon ini dan belum digunakan',
      });
    }

    // Deduct points from user
    user.points -= coupon.points_required;
    await user.save({ transaction });

    // Increase coupon usage count
    coupon.current_usage += 1;
    await coupon.save({ transaction });

    // Create user coupon
    const userCoupon = await UserCoupon.create(
      {
        user_id: user.id,
        coupon_id: coupon.id,
        is_used: false,
        acquired_at: new Date(),
      },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: `Berhasil menukar ${coupon.points_required} poin untuk kupon "${coupon.name}"`,
      data: {
        user_coupon: userCoupon,
        remaining_points: user.points,
        coupon_details: {
          name: coupon.name,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          valid_until: coupon.valid_until,
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Redeem points error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menukar poin',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

// Get user's available coupons
const getUserCoupons = async (req, res) => {
  try {
    const userCoupons = await UserCoupon.findAll({
      where: {
        user_id: req.user.id,
        is_used: false,
      },
      include: [
        {
          model: Coupon,
          as: 'coupon',
          where: {
            is_active: true,
            [Op.or]: [
              { valid_until: null },
              { valid_until: { [Op.gt]: new Date() } },
            ],
          },
          attributes: [
            'id',
            'name',
            'description',
            'discount_type',
            'discount_value',
            'valid_until',
          ],
        },
      ],
      order: [['acquired_at', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: userCoupons,
    });
  } catch (error) {
    console.error('Get user coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kupon',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

// Get all available coupons for redemption
const getAvailableCouponsForRedemption = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'points'],
    });

    // TAMPILKAN SEMUA KUPON AKTIF (tanpa filter points_required)
    const availableCoupons = await Coupon.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { valid_until: null },
          { valid_until: { [Op.gt]: new Date() } },
        ],
        [Op.and]: [
          sequelize.where(sequelize.col('max_usage'), {
            [Op.or]: [null, { [Op.gt]: sequelize.col('current_usage') }],
          }),
        ],
      },
      attributes: [
        'id',
        'name',
        'description',
        'points_required',
        'discount_type',
        'discount_value',
        'valid_until',
        'max_usage',
        'current_usage',
      ],
      order: [['points_required', 'ASC']], 
    });

    res.status(200).json({
      success: true,
      data: {
        user_points: user.points,
        available_coupons: availableCoupons,
      },
    });
  } catch (error) {
    console.error('Get available coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil kupon yang tersedia',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

// Add points to user (for admin or system use)
const addPointsToUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { user_id, points, reason } = req.body;

    if (!user_id || !points || points <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'User ID dan poin (positif) wajib diisi',
      });
    }

    const user = await User.findByPk(user_id, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan',
      });
    }

    user.points += parseInt(points);
    await user.save({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: `Berhasil menambahkan ${points} poin ke user ${user.name}`,
      data: {
        user_id: user.id,
        new_points: user.points,
        reason: reason || 'Manual addition',
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Add points error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan poin',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

module.exports = {
  getUserPoints,
  redeemPointsForCoupon,
  getUserCoupons,
  getAvailableCouponsForRedemption,
  addPointsToUser,
};
