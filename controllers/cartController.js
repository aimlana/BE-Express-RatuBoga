const { Cart, CartItem, Menu, sequelize } = require('../models');

// Helper function untuk mendapatkan atau membuat cart user
const getOrCreateUserCart = async (userId) => {
  let cart = await Cart.findOne({
    where: { userId },
    include: {
      model: CartItem,
      include: [Menu],
    },
  });

  if (!cart) {
    cart = await Cart.create({ userId });
    cart = await Cart.findByPk(cart.id, {
      include: {
        model: CartItem,
        include: [Menu],
      },
    });
  }

  return cart;
};

// Tambah menu ke keranjang
const addItem = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { menuId, quantity = 1, notes } = req.body;

    // Validasi menu
    const menu = await Menu.findByPk(menuId, { transaction });
    if (!menu) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Menu tidak ditemukan',
      });
    }

    // Validasi stok
    if (menu.quantity < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Stok menu tidak mencukupi',
      });
    }

    const cart = await getOrCreateUserCart(userId);

    const [item, created] = await CartItem.findOrCreate({
      where: { cartId: cart.id, menuId },
      defaults: { quantity, notes },
      transaction,
    });

    if (!created) {
      item.quantity += quantity;
      if (notes) item.notes = notes;
      await item.save({ transaction });
    }

    await transaction.commit();

    // Get updated cart
    const updatedCart = await getOrCreateUserCart(userId);

    res.json({
      success: true,
      message: 'Item berhasil ditambahkan ke keranjang',
      data: updatedCart,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan ke keranjang',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Update cart item
const updateItem = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { quantity, notes } = req.body;
    const userId = req.user.id;

    if (quantity && quantity < 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Quantity harus minimal 1',
      });
    }

    const item = await CartItem.findOne({
      where: { id },
      include: [
        {
          model: Cart,
          where: { userId },
        },
        {
          model: Menu,
        },
      ],
      transaction,
    });

    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Item tidak ditemukan',
      });
    }

    // Validasi stok jika update quantity
    if (quantity && item.Menu.quantity < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Stok menu tidak mencukupi',
      });
    }

    if (quantity) item.quantity = quantity;
    if (notes !== undefined) item.notes = notes;

    await item.save({ transaction });
    await transaction.commit();

    // Get updated cart
    const updatedCart = await getOrCreateUserCart(userId);

    res.json({
      success: true,
      message: 'Item berhasil diupdate',
      data: updatedCart,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate keranjang',
    });
  }
};

// Remove item from cart
const removeItem = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const item = await CartItem.findOne({
      where: { id },
      include: [
        {
          model: Cart,
          where: { userId },
        },
      ],
      transaction,
    });

    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Item tidak ditemukan',
      });
    }

    await item.destroy({ transaction });
    await transaction.commit();

    // Get updated cart
    const updatedCart = await getOrCreateUserCart(userId);

    res.json({
      success: true,
      message: 'Item dihapus dari keranjang',
      data: updatedCart,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus dari keranjang',
    });
  }
};

// Get user cart
const getUserCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await getOrCreateUserCart(userId);

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil keranjang',
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({
      where: { userId },
      transaction,
    });

    if (!cart) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Keranjang tidak ditemukan',
      });
    }

    await CartItem.destroy({
      where: { cartId: cart.id },
      transaction,
    });

    await transaction.commit();

    // Get updated cart
    const updatedCart = await getOrCreateUserCart(userId);

    res.json({
      success: true,
      message: 'Keranjang berhasil dikosongkan',
      data: updatedCart,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengosongkan keranjang',
    });
  }
};

module.exports = {
  addItem,
  updateItem,
  removeItem,
  getUserCart,
  clearCart,
};
