const {
  Order,
  OrderItem,
  Menu,
  Payment,
  User,
  UserCoupon,
  Coupon,
  Table,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');

const validateTableNumber = async (req, res) => {
  try {
    const { tableNumber } = req.params;

    if (!tableNumber || isNaN(tableNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Nomor meja tidak valid',
      });
    }

    const tableNum = parseInt(tableNumber);

    const table = await Table.findOne({
      where: {
        table_number: tableNum,
        is_active: true,
      },
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: `Meja #${tableNum} tidak ditemukan atau tidak aktif`,
      });
    }

    res.json({
      success: true,
      message: 'Meja valid',
      data: {
        table_id: table.id,
        table_number: table.table_number,
        qr_code_url: table.qr_code_url,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memvalidasi meja',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

const createOrder = async (req, res) => {
  const { table_number, items, notes, user_coupon_id } = req.body;

  if (!items?.length) {
    return res.status(400).json({
      success: false,
      message: 'Items are required',
    });
  }

  let table = null;
  let table_id = null;

  if (table_number) {
    table = await Table.findOne({
      where: {
        table_number: table_number,
        is_active: true,
      },
    });

    if (!table) {
      return res.status(400).json({
        success: false,
        message: `Nomor meja ${table_number} tidak valid atau tidak aktif`,
      });
    }
    table_id = table.id;
  }

  const type = table_number ? 'dine-in' : 'take-away';
  const transaction = await sequelize.transaction();

  try {
    const menus = await Menu.findAll({
      where: { id: items.map((i) => i.menu_id) },
      transaction,
    });

    let total_price = menus.reduce((sum, menu) => {
      const item = items.find((i) => i.menu_id === menu.id);
      return sum + menu.price * item.quantity;
    }, 0);

    let discount_amount = 0;
    let coupon_used = null;
    let final_price = total_price;
    let user_coupon = null;

    if (user_coupon_id && req.user?.id) {
      try {
        user_coupon = await UserCoupon.findOne({
          where: {
            id: user_coupon_id,
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
            },
          ],
          transaction,
        });

        if (user_coupon && user_coupon.coupon) {
          const coupon = user_coupon.coupon;

          if (coupon.max_usage && coupon.current_usage >= coupon.max_usage) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Kupon sudah mencapai batas penggunaan',
            });
          }

          if (coupon.discount_type === 'percentage') {
            discount_amount = Math.floor(
              total_price * (coupon.discount_value / 100),
            );
          } else if (coupon.discount_type === 'fixed') {
            discount_amount = Math.min(coupon.discount_value, total_price);
          }

          final_price = Math.max(0, total_price - discount_amount);

          await Coupon.increment('current_usage', {
            by: 1,
            where: { id: coupon.id },
            transaction,
          });

          const [affectedRows] = await UserCoupon.update(
            {
              is_used: true,
              used_at: new Date(),
            },
            {
              where: {
                id: user_coupon.id,
                is_used: false,
              },
              transaction,
            },
          );

          if (affectedRows === 0) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Kupon sudah digunakan oleh proses lain',
            });
          }

          coupon_used = {
            coupon_id: coupon.id,
            coupon_name: coupon.name,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            discount_amount: discount_amount,
            user_coupon_id: user_coupon.id,
          };
        }
      } catch (couponError) {
        // Continue without coupon if there's an error
        console.error('Coupon error:', couponError);
      }
    }

    const order = await Order.create(
      {
        table_id: table_id,
        type,
        status: 'pending',
        payment_type: 'cash',
        is_paid: false,
        total_price: final_price,
        original_price: total_price,
        discount_amount: discount_amount,
        user_id: req.user?.id || null,
        notes: notes || null,
        coupon_used: coupon_used ? JSON.stringify(coupon_used) : null,
        points_awarded: false,
        points_earned: 0,
      },
      { transaction },
    );

    await OrderItem.bulkCreate(
      items.map((item) => ({
        order_id: order.id,
        menu_id: item.menu_id,
        quantity: item.quantity,
        subtotal:
          menus.find((m) => m.id === item.menu_id).price * item.quantity,
      })),
      { transaction },
    );

    await Payment.create(
      {
        order_id: order.id,
        amount: final_price,
        status: 'pending',
      },
      { transaction },
    );

    await transaction.commit();

    // ============= WEBSOCKET EMIT UNTUK PESANAN BARU =============
    try {
      if (global.io) {
        const fullOrder = await Order.findByPk(order.id, {
          include: [
            {
              model: OrderItem,
              as: 'items',
              include: {
                model: Menu,
                attributes: ['id', 'name', 'price', 'imageUrl'],
              },
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email'],
              required: false,
            },
            {
              model: Table,
              as: 'table',
              attributes: ['id', 'table_number', 'is_active'],
              required: false,
            },
          ],
        });

        const orderForEmit = fullOrder.toJSON();

        // Parse coupon_used jika ada
        if (orderForEmit.coupon_used) {
          try {
            orderForEmit.coupon_used = JSON.parse(orderForEmit.coupon_used);
          } catch (e) {
            console.error('Error parsing coupon_used:', e);
          }
        }

        // Emit event ke admin room
        global.io.to('admin-room').emit('order-created', {
          orderId: order.id,
          order: orderForEmit,
          type: 'new-order',
          timestamp: new Date().toISOString(),
          message: `Pesanan baru #${order.id} telah dibuat`,
          source: req.user ? 'user' : 'guest',
          customerName: req.user?.name || 'Guest',
          tableNumber: table_number || 'Take Away',
          totalAmount: final_price,
        });

        console.log(`📢 WebSocket emit: order-created for order #${order.id}`);
      }
    } catch (wsError) {
      console.error('❌ WebSocket emit error in createOrder:', wsError);
    }
    // ============= END WEBSOCKET EMIT =============

    return res.json({
      success: true,
      orderId: order.id,
      message: coupon_used
        ? 'Order berhasil dibuat dengan kupon'
        : 'Order created successfully',
      data: {
        order_id: order.id,
        table_number: table_number,
        total_price: final_price,
        original_price: total_price,
        discount_amount: discount_amount,
        coupon_used: coupon_used,
        points_earned: 0,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

const createOrderGuest = async (req, res) => {
  const {
    table_number,
    items,
    notes,
    payment_type,
    service_type,
    totalAmount,
  } = req.body;

  if (!items?.length) {
    return res.status(400).json({
      success: false,
      message: 'Items are required',
    });
  }

  let table = null;
  let table_id = null;

  if (table_number) {
    table = await Table.findOne({
      where: { table_number, is_active: true },
    });

    if (!table) {
      return res.status(400).json({
        success: false,
        message: `Nomor meja ${table_number} tidak valid atau tidak aktif`,
      });
    }

    table_id = table.id;
  }

  const type = table_number ? 'dine-in' : 'take-away';
  const transaction = await sequelize.transaction();

  try {
    const menus = await Menu.findAll({
      where: { id: items.map((i) => i.menu_id) },
      transaction,
    });

    const total_price = menus.reduce((sum, menu) => {
      const item = items.find((i) => i.menu_id === menu.id);
      return sum + menu.price * item.quantity;
    }, 0);

    const order = await Order.create(
      {
        table_id,
        type,
        status: 'pending',
        payment_type: payment_type || 'cash',
        is_paid: false,
        total_price,
        original_price: total_price,
        discount_amount: 0,
        user_id: null,
        notes: notes || null,
        coupon_used: null,
        points_awarded: false,
        points_earned: 0,
      },
      { transaction },
    );

    await OrderItem.bulkCreate(
      items.map((item) => ({
        order_id: order.id,
        menu_id: item.menu_id,
        quantity: item.quantity,
        subtotal:
          menus.find((m) => m.id === item.menu_id).price * item.quantity,
      })),
      { transaction },
    );

    await Payment.create(
      {
        order_id: order.id,
        amount: total_price,
        status: 'pending',
      },
      { transaction },
    );

    await transaction.commit();

    // ============= WEBSOCKET EMIT UNTUK PESANAN BARU GUEST =============
    try {
      if (global.io) {
        const fullOrder = await Order.findByPk(order.id, {
          include: [
            {
              model: OrderItem,
              as: 'items',
              include: {
                model: Menu,
                attributes: ['id', 'name', 'price', 'imageUrl'],
              },
            },
            {
              model: Table,
              as: 'table',
              attributes: ['id', 'table_number', 'is_active'],
              required: false,
            },
          ],
        });

        const orderForEmit = fullOrder.toJSON();

        // Emit event ke admin room
        global.io.to('admin-room').emit('order-created', {
          orderId: order.id,
          order: orderForEmit,
          type: 'new-order',
          timestamp: new Date().toISOString(),
          message: `Pesanan baru #${order.id} (Guest) telah dibuat`,
          source: 'guest',
          customerName: 'Guest',
          tableNumber: table_number || 'Take Away',
          totalAmount: total_price,
        });

        console.log(
          `📢 WebSocket emit: order-created for guest order #${order.id}`,
        );
      }
    } catch (wsError) {
      console.error('❌ WebSocket emit error in createOrderGuest:', wsError);
    }
    // ============= END WEBSOCKET EMIT =============

    return res.json({
      success: true,
      orderId: order.id,
      message: 'Guest order created successfully',
      data: {
        order_id: order.id,
        table_number,
        total_price,
        type,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Guest order creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create guest order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const getAllOrders = async (req, res) => {
  const { page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: orders } = await Order.findAndCountAll({
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: {
            model: Menu,
            attributes: ['name', 'price'],
          },
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role_id'],
          required: false,
        },
        {
          model: Table,
          as: 'table',
          attributes: ['table_number', 'is_active'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data pesanan',
      data: orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pesanan',
    });
  }
};

// GET PUBLIC ORDER BY ID
const getPublicOrderById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const order = await Order.findOne({
      where: {
        id,
        user_id: null,
      },
      attributes: [
        'id',
        'status',
        'type',
        'payment_type',
        'is_paid',
        'total_price',
        'original_price',
        'discount_amount',
        'notes',
        'createdAt',
      ],
      include: [
        {
          model: OrderItem,
          as: 'items',
          attributes: ['id', 'quantity', 'subtotal'],
          include: {
            model: Menu,
            attributes: ['id', 'name', 'price', 'imageUrl'],
          },
        },
        {
          model: Table,
          as: 'table',
          attributes: ['table_number'],
          required: false,
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        errorType: 'ORDER_NOT_FOUND_OR_USER_ORDER',
      });
    }

    if (userId) {
      return res.status(403).json({
        success: false,
        message:
          'Order ini adalah order guest. Silakan logout untuk mengakses order guest.',
        errorType: 'USER_ACCESSING_GUEST_ORDER',
      });
    }

    const orderData = order.toJSON();

    res.json({
      success: true,
      data: orderData,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// GET ORDER BY ID 
// orderController.js - update getOrderById
const getOrderById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const order = await Order.findOne({
      where: { id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: {
            model: Menu,
            attributes: ['id', 'name', 'price', 'imageUrl'],
          },
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role_id'],
          required: false,
        },
        {
          model: Table,
          as: 'table',
          attributes: ['table_number', 'is_active'],
          required: false,
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // ⭐ PERBEDAAN: Admin bisa akses semua, user hanya milik sendiri
    if (userRole !== 'admin' && order.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access. This order does not belong to you.',
      });
    }

    const orderData = order.toJSON();
    if (orderData.coupon_used) {
      try {
        orderData.coupon_used = JSON.parse(orderData.coupon_used);
      } catch (e) {
        // Ignore parsing error
      }
    }

    res.status(200).json({
      success: true,
      data: orderData,
    });
  } catch (err) {
    console.error('getOrderById error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
    });
  }
};

const addPointsAfterOrderCompletion = async (orderId) => {
  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findByPk(orderId, { transaction });

    if (!order) {
      await transaction.rollback();
      return;
    }

    if (order.status !== 'done') {
      await transaction.rollback();
      return;
    }

    if (!order.is_paid) {
      await transaction.rollback();
      return;
    }

    if (!order.user_id) {
      await transaction.rollback();
      return;
    }

    if (order.points_awarded) {
      await transaction.rollback();
      return;
    }

    const points_earned = Math.floor(order.total_price / 10000);

    if (points_earned > 0) {
      const user = await User.findByPk(order.user_id, { transaction });

      if (!user) {
        await transaction.rollback();
        return;
      }

      user.points += points_earned;
      await user.save({ transaction });

      order.points_awarded = true;
      order.points_earned = points_earned;
      await order.save({ transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
  }
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: {
            model: Menu,
            attributes: ['id', 'name', 'price', 'imageUrl'],
          },
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role_id'],
          required: false,
        },
        {
          model: Table,
          as: 'table',
          attributes: ['table_number'],
          required: false,
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const validTransitions = {
      pending: ['processing'],
      processing: ['done'],
      done: [],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status}`,
      });
    }

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    try {
      if (global.io) {
        const orderData = order.toJSON();

        if (orderData.coupon_used) {
          try {
            orderData.coupon_used = JSON.parse(orderData.coupon_used);
          } catch (e) {
            // Ignore parsing error
          }
        }

        global.io.to('admin-room').emit('order-status-updated', {
          orderId: id,
          oldStatus: oldStatus,
          newStatus: status,
          order: orderData,
          timestamp: new Date().toISOString(),
        });

        global.io.to(`order-${id}`).emit('order-status-changed', {
          orderId: id,
          oldStatus: oldStatus,
          newStatus: status,
          order: orderData,
          message: `Status pesanan berubah dari ${oldStatus} menjadi ${status}`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (wsError) {
      // Don't fail request due to WebSocket error
    }

    if (status === 'done' && order.is_paid && order.user_id) {
      addPointsAfterOrderCompletion(order.id);
    }

    res.json({
      success: true,
      data: order,
      message: `Status order berhasil diupdate dari ${oldStatus} menjadi ${status}`,
      realTimeUpdate: !!global.io,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
    });
  }
};

const confirmCashPayment = async (req, res) => {
  const { id } = req.params;
  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: {
            model: Menu,
            attributes: ['id', 'name', 'price', 'imageUrl'],
          },
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', , 'role_id'],
          required: false,
        },
        {
          model: Table,
          as: 'table',
          attributes: ['table_number'],
          required: false,
        },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.payment_type !== 'cash') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only cash payments can be confirmed',
      });
    }

    order.is_paid = true;
    await order.save({ transaction });

    const payment = await Payment.findOne({
      where: { order_id: id },
      transaction,
    });

    if (payment) {
      payment.status = 'completed';
      payment.paid_at = new Date();
      await payment.save({ transaction });
    } else {
      await Payment.create(
        {
          order_id: id,
          amount: order.total_price,
          status: 'completed',
          paid_at: new Date(),
          payment_type: 'cash',
        },
        { transaction },
      );
    }

    await transaction.commit();

    try {
      if (global.io) {
        const orderData = order.toJSON();

        if (orderData.coupon_used) {
          try {
            orderData.coupon_used = JSON.parse(orderData.coupon_used);
          } catch (e) {
            // Ignore parsing error
          }
        }

        global.io.to('admin-room').emit('payment-confirmed', {
          orderId: id,
          is_paid: true,
          order: orderData,
          payment: payment ? payment.toJSON() : null,
          timestamp: new Date().toISOString(),
          message: `Pembayaran untuk order #${id} telah dikonfirmasi`,
        });

        global.io.to(`order-${id}`).emit('payment-status-changed', {
          orderId: id,
          is_paid: true,
          order: orderData,
          message: `Pembayaran telah dikonfirmasi - Status: LUNAS`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (wsError) {
      // Don't fail request due to WebSocket error
    }

    if (order.status === 'done' && order.user_id) {
      addPointsAfterOrderCompletion(order.id);
    }

    return res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        order: order.toJSON(),
        payment: payment ? payment.toJSON() : null,
      },
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const getReport = async (req, res) => {
  try {
    const { from, to, payment_type } = req.query;

    const where = {
      status: 'done',
      is_paid: true,
    };

    if (from && to) {
      where.createdAt = {
        [Op.between]: [new Date(from), new Date(to)],
      };
    }

    if (payment_type) {
      where.payment_type = payment_type;
    }

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: Table,
          as: 'table',
          attributes: ['table_number'],
          required: false,
        },
      ],
    });

    const total_income = orders.reduce((acc, o) => acc + o.total_price, 0);
    const total_discount = orders.reduce(
      (acc, o) => acc + (o.discount_amount || 0),
      0,
    );
    const total_orders_with_coupon = orders.filter(
      (o) => o.discount_amount > 0,
    ).length;
    const total_points_given = orders.reduce(
      (acc, o) => acc + (o.points_earned || 0),
      0,
    );

    res.json({
      total_order: orders.length,
      total_income,
      total_discount,
      total_orders_with_coupon,
      total_points_given,
      average_discount:
        total_orders_with_coupon > 0
          ? Math.round(total_discount / total_orders_with_coupon)
          : 0,
      orders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan',
    });
  }
};

const getUserOrderHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: {
            model: Menu,
            attributes: ['name', 'price'],
          },
        },
        {
          model: Table,
          as: 'table',
          attributes: ['table_number'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const completedOrders = await Order.findAll({
      where: {
        user_id: req.user.id,
        status: 'done',
        is_paid: true,
      },
      attributes: ['total_price', 'points_earned', 'discount_amount'],
    });

    const total_points_earned = completedOrders.reduce((sum, order) => {
      return sum + (order.points_earned || 0);
    }, 0);

    const total_savings = completedOrders.reduce((sum, order) => {
      return sum + (order.discount_amount || 0);
    }, 0);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil riwayat pesanan',
      data: {
        orders: orders,
        points_summary: {
          total_points_earned: total_points_earned,
          total_orders: completedOrders.length,
          total_spent: completedOrders.reduce(
            (sum, order) => sum + order.total_price,
            0,
          ),
          total_savings: total_savings,
          current_points: req.user.points,
        },
      },
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat pesanan',
    });
  }
};

const validateCouponForOrder = async (req, res) => {
  try {
    const { user_coupon_id, total_amount } = req.body;

    if (!user_coupon_id || !req.user?.id) {
      return res.status(400).json({
        success: false,
        message: 'User coupon ID dan user ID diperlukan',
      });
    }

    const userCoupon = await UserCoupon.findOne({
      where: {
        id: user_coupon_id,
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
        },
      ],
    });

    if (!userCoupon || !userCoupon.coupon) {
      return res.status(404).json({
        success: false,
        message: 'Kupon tidak valid atau sudah digunakan',
      });
    }

    const coupon = userCoupon.coupon;
    let discount_amount = 0;

    if (coupon.discount_type === 'percentage') {
      discount_amount = Math.floor(
        total_amount * (coupon.discount_value / 100),
      );
    } else if (coupon.discount_type === 'fixed') {
      discount_amount = Math.min(coupon.discount_value, total_amount);
    }

    const final_price = Math.max(0, total_amount - discount_amount);

    res.json({
      success: true,
      data: {
        valid: true,
        coupon: {
          name: coupon.name,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          discount_amount: discount_amount,
          final_price: final_price,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal validasi kupon',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

module.exports = {
  validateTableNumber,
  createOrder,
  createOrderGuest,
  getAllOrders,
  getOrderById,
  getPublicOrderById,
  updateOrderStatus,
  confirmCashPayment,
  getReport,
  getUserOrderHistory,
  validateCouponForOrder,
};
