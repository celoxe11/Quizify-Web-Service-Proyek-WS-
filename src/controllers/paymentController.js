const midtransClient = require("midtrans-client");
const {
  User,
  Transaction,
  Subscription,
  Avatar,
  Item,
  UserAvatar,
} = require("../models");

// Initialize Snap API Client (untuk generate payment snap)
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true" || false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Initialize Core API Client (untuk verifikasi)
const core = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true" || false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Generate Unique Order ID
const generateOrderId = () => {
  return `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

/**
 * CREATE PAYMENT - Generate Midtrans Snap Token
 * Endpoint: POST /api/payment/create
 * Body: { type: 'subscription' | 'avatar', subscription_id OR avatar_id, payment_method }
 */
const createPayment = async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    const {
      type = "subscription",
      subscription_id,
      avatar_id,
      payment_method,
    } = req.body;

    // 1. Validasi User
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    // 2. Tentukan Item yang dibeli berdasarkan type
    let itemName = "";
    let itemPrice = 0;
    let itemId = null;
    let category = "subscription";

    if (type === "subscription") {
      // SUBSCRIPTION PURCHASE
      const subscription = await Subscription.findOne({
        where: { id_subs: subscription_id },
      });
      if (!subscription) {
        return res
          .status(404)
          .json({ message: "Paket subscription tidak ditemukan" });
      }

      itemName = `Upgrade ke ${subscription.status}`;
      itemPrice = parseFloat(subscription.price);
      itemId = subscription_id;

      // Hindari duplikasi pembayaran untuk subscription yang sama
      const activePendingTransaction = await Transaction.findOne({
        where: {
          user_id: userId,
          subscription_id: subscription_id,
          status: "pending",
        },
      });
      if (activePendingTransaction) {
        return res.status(400).json({
          message: "Anda sudah memiliki transaksi pending untuk paket ini",
          transaction_id: activePendingTransaction.id,
        });
      }
    } else if (type === "avatar") {
      // AVATAR PURCHASE
      const avatar = await Avatar.findOne({
        where: { id: avatar_id },
      });
      if (!avatar) {
        return res.status(404).json({ message: "Avatar tidak ditemukan" });
      }

      // Cek apakah user sudah punya avatar ini
      const alreadyOwned = await UserAvatar.findOne({
        where: { user_id: userId, avatar_id: avatar_id },
      });
      if (alreadyOwned) {
        return res.status(400).json({
          message: "Anda sudah memiliki avatar ini",
        });
      }

      itemName = `Avatar - ${avatar.name}`;
      itemPrice = parseFloat(avatar.price);
      itemId = avatar_id;
      category = "avatar";
    } else {
      return res
        .status(400)
        .json({
          message:
            "Tipe pembayaran tidak valid. Gunakan 'subscription' atau 'avatar'",
        });
    }

    // 3. Generate Order ID & Simpan Transaction (PENDING)
    const orderId = generateOrderId();
    const amount = itemPrice * 100; // Midtrans dalam satuan rupiah

    const transaction = await Transaction.create({
      id: orderId,
      user_id: userId,
      subscription_id: type === "subscription" ? subscription_id : null,
      item_id: type === "avatar" ? avatar_id : null,
      category: category,
      amount: itemPrice,
      status: "pending",
      payment_method: payment_method || "credit_card",
    });

    // 4. Buat Snap Transaction
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: user.name,
        email: user.email,
        phone: user.phone || "",
      },
      item_details: [
        {
          id: type === "subscription" ? subscription_id : avatar_id,
          price: amount,
          quantity: 1,
          name: itemName,
          merchant_id: process.env.MIDTRANS_MERCHANT_ID || "M2",
        },
      ],
      expiry: {
        unit: "minute",
        duration: 60, // Token berlaku 60 menit
      },
    };

    const snapToken = await snap.createTransaction(parameter);

    return res.status(201).json({
      message: "Payment snap berhasil dibuat",
      transaction_id: orderId,
      snap_token: snapToken.token,
      snap_redirect_url: snapToken.redirect_url,
      item: {
        type: type,
        name: itemName,
        price: itemPrice,
      },
    });
  } catch (error) {
    console.error("Create Payment Error:", error);
    return res.status(500).json({
      message: `Gagal membuat payment snap - ${error.message}`,
    });
  }
};

/**
 * VERIFY PAYMENT - Terima notifikasi dari Midtrans
 * Endpoint: POST /api/payment/verify (webhook)
 * Body: Midtrans notification
 */
const verifyPayment = async (req, res) => {
  try {
    const notificationData = req.body;
    const { order_id, transaction_status, payment_type } = notificationData;

    console.log("Midtrans Notification:", notificationData);

    // 1. Cari Transaction by Order ID
    const transaction = await Transaction.findOne({
      where: { id: order_id },
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaksi tidak ditemukan",
      });
    }

    // 2. Tentukan status berdasarkan transaction_status dari Midtrans
    let newStatus = "pending";
    if (
      transaction_status === "capture" ||
      transaction_status === "settlement"
    ) {
      newStatus = "success";
    } else if (transaction_status === "pending") {
      newStatus = "pending";
    } else if (
      transaction_status === "cancel" ||
      transaction_status === "expire" ||
      transaction_status === "deny"
    ) {
      newStatus = "failed";
    }

    // 3. Update Transaction Status
    await Transaction.update(
      {
        status: newStatus,
        payment_method: payment_type,
      },
      {
        where: { id: order_id },
      }
    );

    // 4. Jika SUCCESS, lakukan action berdasarkan category
    if (newStatus === "success") {
      if (transaction.category === "subscription") {
        // UPDATE User Subscription
        await User.update(
          { subscription_id: transaction.subscription_id },
          { where: { id: transaction.user_id } }
        );
        console.log(
          `User ${transaction.user_id} upgraded to subscription ${transaction.subscription_id}`
        );
      } else if (transaction.category === "avatar") {
        // TAMBAH Avatar ke Inventory User (UserAvatar)
        await UserAvatar.create({
          user_id: transaction.user_id,
          avatar_id: transaction.item_id,
          purchased_at: new Date(),
        });
        console.log(
          `User ${transaction.user_id} purchased avatar ${transaction.item_id}`
        );
      }
    }

    // 5. Response ke Midtrans (status 200)
    return res.status(200).json({
      message: "Notifikasi pembayaran diproses",
      status: newStatus,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({
      message: `Gagal verifikasi payment - ${error.message}`,
    });
  }
};

/**
 * CHECK PAYMENT STATUS
 * Endpoint: GET /api/payment/status/:order_id
 * Check status transaksi dari Midtrans
 */
const checkPaymentStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    const userId = req.user.id || req.user.uid;

    // 1. Cari Transaction di DB
    const transaction = await Transaction.findOne({
      where: { id: order_id },
      include: [
        {
          model: Subscription,
          attributes: ["id_subs", "status", "price"],
          as: "subscription_detail",
        },
        {
          model: Avatar,
          attributes: ["id", "name", "price", "image_url"],
          as: "item_detail",
        },
      ],
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaksi tidak ditemukan",
      });
    }

    // 2. Validasi ownership
    if (transaction.user_id !== userId) {
      return res.status(403).json({
        message: "Anda tidak berhak melihat transaksi ini",
      });
    }

    // 3. Jika status masih pending, check ke Midtrans
    if (transaction.status === "pending") {
      try {
        const statusData = await core.transaction.status(order_id);
        const midtransStatus = statusData.transaction_status;

        // Update local status jika berbeda
        if (midtransStatus === "settlement" || midtransStatus === "capture") {
          await Transaction.update(
            { status: "success" },
            { where: { id: order_id } }
          );

          // Update user sesuai kategori
          if (transaction.category === "subscription") {
            await User.update(
              { subscription_id: transaction.subscription_id },
              { where: { id: userId } }
            );
          } else if (transaction.category === "avatar") {
            await UserAvatar.create({
              user_id: userId,
              avatar_id: transaction.item_id,
              purchased_at: new Date(),
            });
          }
        } else if (
          midtransStatus === "cancel" ||
          midtransStatus === "expire" ||
          midtransStatus === "deny"
        ) {
          await Transaction.update(
            { status: "failed" },
            { where: { id: order_id } }
          );
        }
      } catch (midtransError) {
        console.error("Midtrans Status Check Error:", midtransError);
        // Tetap gunakan status lokal jika Midtrans error
      }
    }

    // 4. Re-fetch untuk data terbaru
    const updatedTransaction = await Transaction.findOne({
      where: { id: order_id },
      include: [
        {
          model: Subscription,
          attributes: ["id_subs", "status", "price"],
          as: "subscription_detail",
        },
        {
          model: Avatar,
          attributes: ["id", "name", "price", "image_url"],
          as: "item_detail",
        },
      ],
    });

    // Format response berdasarkan category
    const itemInfo =
      updatedTransaction.category === "subscription"
        ? updatedTransaction.subscription_detail
        : updatedTransaction.item_detail;

    return res.status(200).json({
      message: "Status transaksi berhasil diambil",
      data: {
        transaction_id: updatedTransaction.id,
        status: updatedTransaction.status,
        category: updatedTransaction.category,
        amount: updatedTransaction.amount,
        item: itemInfo,
        created_at: updatedTransaction.created_at,
      },
    });
  } catch (error) {
    console.error("Check Payment Status Error:", error);
    return res.status(500).json({
      message: `Gagal check status payment - ${error.message}`,
    });
  }
};

/**
 * GET TRANSACTION HISTORY
 * Endpoint: GET /api/payment/history
 * Ambil riwayat pembayaran user
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;

    const transactions = await Transaction.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Subscription,
          attributes: ["id_subs", "status", "price"],
          as: "subscription_detail",
        },
        {
          model: Avatar,
          attributes: ["id", "name", "price", "image_url"],
          as: "item_detail",
        },
      ],
      order: [["created_at", "DESC"]],
    });

    if (!transactions.length) {
      return res.status(200).json({
        message: "Belum ada riwayat pembayaran",
        data: [],
      });
    }

    const formatted = transactions.map((t) => {
      const itemInfo =
        t.category === "subscription"
          ? {
              type: "subscription",
              name: t.subscription_detail?.status || "Unknown",
              price: t.subscription_detail?.price || t.amount,
            }
          : {
              type: "avatar",
              name: t.item_detail?.name || "Unknown Avatar",
              price: t.item_detail?.price || t.amount,
              image: t.item_detail?.image_url || null,
            };

      return {
        transaction_id: t.id,
        category: t.category,
        item: itemInfo,
        amount: parseFloat(t.amount),
        status: t.status,
        payment_method: t.payment_method,
        created_at: t.created_at,
        updated_at: t.updated_at,
      };
    });

    return res.status(200).json({
      message: "Riwayat pembayaran berhasil diambil",
      data: formatted,
    });
  } catch (error) {
    console.error("Get Payment History Error:", error);
    return res.status(500).json({
      message: `Gagal ambil riwayat pembayaran - ${error.message}`,
    });
  }
};

/**
 * CANCEL PAYMENT
 * Endpoint: POST /api/payment/cancel/:order_id
 * Batalkan pembayaran yang pending
 */
const cancelPayment = async (req, res) => {
  try {
    const { order_id } = req.params;
    const userId = req.user.id || req.user.uid;

    // 1. Cari Transaction
    const transaction = await Transaction.findOne({
      where: { id: order_id },
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaksi tidak ditemukan",
      });
    }

    // 2. Validasi ownership
    if (transaction.user_id !== userId) {
      return res.status(403).json({
        message: "Anda tidak berhak membatalkan transaksi ini",
      });
    }

    // 3. Hanya bisa batalkan yang status pending
    if (transaction.status !== "pending") {
      return res.status(400).json({
        message: `Tidak bisa membatalkan transaksi dengan status ${transaction.status}`,
      });
    }

    // 4. Cancel di Midtrans
    try {
      await core.transaction.cancel(order_id);
    } catch (error) {
      console.error("Midtrans Cancel Error:", error);
      // Tetap lanjut update local DB meski Midtrans error
    }

    // 5. Update local status
    await Transaction.update({ status: "failed" }, { where: { id: order_id } });

    return res.status(200).json({
      message: "Transaksi berhasil dibatalkan",
    });
  } catch (error) {
    console.error("Cancel Payment Error:", error);
    return res.status(500).json({
      message: `Gagal batalkan pembayaran - ${error.message}`,
    });
  }
};

const getPlanPackageFeatures = async (req, res) => {
  try {
    const { plan_status } = req.params;
    const subscription = await Subscription.findOne({
      where: { status: plan_status },
    });

    if (!subscription) {
      return res.status(404).json({ message: "Paket subscription tidak ditemukan" });
    }
    const features = getPackageFeatures(subscription.status);

    return res.status(200).json({
      message: 'Package features berhasil diambil',
      data: {
        id: subscription.id_subs,
        name: subscription.status,
        price: parseFloat(subscription.price),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET USER AVATARS
 * Endpoint: GET /api/payment/my-avatars
 * Ambil daftar avatar yang sudah dimiliki user
 */
const getUserAvatars = async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;

    // Ambil user dengan inventory avatar
    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Avatar,
          as: "inventory",
          attributes: [
            "id",
            "name",
            "description",
            "image_url",
            "price",
            "rarity",
          ],
          through: {
            attributes: ["purchased_at"],
            as: "purchase_info",
          },
        },
        {
          model: Avatar,
          as: "activeAvatar",
          attributes: ["id", "name", "image_url"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const formatted = {
      current_avatar: user.activeAvatar || null,
      owned_avatars: user.inventory.map((avatar) => ({
        id: avatar.id,
        name: avatar.name,
        description: avatar.description,
        image_url: avatar.image_url,
        price: avatar.price,
        rarity: avatar.rarity,
        purchased_at: avatar.UserAvatar?.purchased_at || null,
      })),
      total_owned: user.inventory.length,
    };

    return res.status(200).json({
      message: "Avatar berhasil diambil",
      data: formatted,
    });
  } catch (error) {
    console.error("Get User Avatars Error:", error);
    return res.status(500).json({
      message: `Gagal ambil avatar - ${error.message}`,
    });
  }
};

/**
 * SET ACTIVE AVATAR
 * Endpoint: PUT /api/payment/set-avatar/:avatar_id
 * Ganti avatar aktif user
 */
const setActiveAvatar = async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    const { avatar_id } = req.params;

    // 1. Cek user
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    // 2. Cek avatar ada
    const avatar = await Avatar.findOne({ where: { id: avatar_id } });
    if (!avatar) {
      return res.status(404).json({ message: "Avatar tidak ditemukan" });
    }

    // 3. Cek user punya avatar ini
    const owned = await UserAvatar.findOne({
      where: { user_id: userId, avatar_id: avatar_id },
    });
    if (!owned) {
      return res.status(400).json({
        message: "Anda tidak memiliki avatar ini",
      });
    }

    // 4. Set sebagai active
    await User.update(
      { current_avatar_id: avatar_id },
      { where: { id: userId } }
    );

    return res.status(200).json({
      message: "Avatar berhasil diganti",
      data: {
        avatar_id: avatar_id,
        avatar_name: avatar.name,
        image_url: avatar.image_url,
      },
    });
  } catch (error) {
    console.error("Set Active Avatar Error:", error);
    return res.status(500).json({
      message: `Gagal ganti avatar - ${error.message}`,
    });
  }
};

module.exports = {
  createPayment,
  verifyPayment,
  checkPaymentStatus,
  getPaymentHistory,
  cancelPayment,
  getPlanPackageFeatures,
  getUserAvatars,
  setActiveAvatar,
};
