const midtransClient = require("midtrans-client");
const {
  User,
  Transaction,
  Subscription,
  Avatar,
  Item,
  UserAvatar,
} = require("../models");
const crypto = require('crypto');

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

// Generate Unique Order ID - Format: TR000001, TR000002, etc. (varchar 10)
const generateOrderId = async () => {
  let tryNum = 1;
  while (tryNum < 1000) { // Hindari infinite loop
    const latestTransaction = await Transaction.findOne({
      attributes: ["id"],
      raw: true,
      order: [["id", "DESC"]],
    });

    let newNum = 1;
    if (latestTransaction && latestTransaction.id) {
      const lastNum = parseInt(latestTransaction.id.substring(2)) || 0;
      newNum = lastNum + 1;
    }
    const newId = `TR${String(newNum).padStart(6, "0")}`;

    // Cek apakah ID sudah ada
    const exists = await Transaction.findOne({ where: { id: newId }, raw: true });
    if (!exists) return newId;

    // Jika sudah ada, lanjutkan loop
    tryNum++;
  }
  // Fallback jika gagal
  return `TR${String(Date.now()).slice(-6)}`;
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
      category = "subscription";

      // Hindari duplikasi pembayaran untuk subscription yang sama
      const activePendingTransaction = await Transaction.findOne({
        where: {
          user_id: userId,
          subscription_id: subscription_id,
          status: "pending",
          category: "subscription",
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

      // Hindari duplikasi pembayaran avatar yang sama (pending)
      const activePendingTransaction = await Transaction.findOne({
        where: {
          user_id: userId,
          item_id: avatar_id,
          status: "pending",
          category: "item",
        },
      });
      if (activePendingTransaction) {
        return res.status(400).json({
          message: "Anda sudah memiliki transaksi pending untuk item ini",
          transaction_id: activePendingTransaction.id,
        });
      }
    } else {
      return res
        .status(400)
        .json({
          message:
            "Tipe pembayaran tidak valid. Gunakan 'subscription' atau 'avatar'",
        });
    }

    // 3. Generate Order ID & Simpan Transaction (PENDING)
    const orderId = await generateOrderId();
    const amount = itemPrice;

    const transaction = await Transaction.create({
      id: orderId,
      user_id: userId,
      subscription_id: type === "subscription" ? subscription_id : null,
      item_id: type === "avatar" ? avatar_id : null,
      category: category,
      amount: itemPrice,
      status: "success",
      payment_method: "bank",
    });

    // Jika payment berhasil dan tipe subscription, update subscription_id pada user
    if (category === "subscription" && subscription_id) {
      // Ambil id_subs dari Subscription
      const subs = await Subscription.findOne({ where: { id_subs: transaction.subscription_id } });
      if (subs) {
        await User.update(
          { subscription_id: subs.id_subs },
          { where: { id: transaction.user_id } }
        );
      }
    }

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

const forceVerifyStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Cari transaksi di database Anda
    const transaction = await Transaction.findByPk(orderId);

    if (!transaction) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    // 2. Jika status di DB sudah sukses/failed, langsung kembalikan (tidak perlu tanya Midtrans)
    if (transaction.status !== 'pending') {
      return res.status(200).json({ 
        data: {
          orderId: transaction.id,
          status: transaction.status,
          payment_method: transaction.payment_method
        }
      });
    }

    // 3. Jika status masih PENDING, kita "Paksa" tanya ke Midtrans
    console.log(`Force syncing status for: ${orderId}...`);
    
    // Memanggil API Get Status Midtrans
    const midtransStatus = await snap.transaction.status(orderId);

    /* Contoh respon midtransStatus:
       { transaction_status: 'settlement', payment_type: 'gopay', ... }
    */

    // 4. Update Database berdasarkan respon terbaru Midtrans
    let updatedStatus = transaction.status;
    const midStatus = midtransStatus.transaction_status;

    if (midStatus === 'capture' || midStatus === 'settlement') {
      updatedStatus = 'success';
    } else if (['cancel', 'deny', 'expire'].includes(midStatus)) {
      updatedStatus = 'failed';
    }

    // Jika ada perubahan status dari pending ke success/failed, lakukan update
    if (updatedStatus !== transaction.status) {
      await Transaction.update(
        { 
          status: updatedStatus,
          payment_method: midtransStatus.payment_type 
        },
        { where: { id: orderId } }
      );

      // JALANKAN LOGIKA BISNIS (Beri subscription/avatar)
      if (updatedStatus === 'success') {
        if (transaction.category === 'subscription') {
          await User.update(
            { subscription_id: transaction.subscription_id },
            { where: { id: transaction.user_id } }
          );
        } else if (transaction.category === 'avatar') {
          await UserAvatar.findOrCreate({
            where: { user_id: transaction.user_id, avatar_id: transaction.item_id },
            defaults: { purchased_at: new Date() }
          });
        }
      }
      console.log(`Transaction ${orderId} updated to ${updatedStatus} via Force Sync`);
    }

    // 5. Kembalikan data terbaru ke Flutter
    return res.status(200).json({
      data: {
        orderId: orderId,
        status: updatedStatus, // Status terbaru (success/failed/pending)
        payment_method: midtransStatus.payment_type
      }
    });

  } catch (error) {
    console.error("Force Sync Error:", error);
    // Jika error karena transaksi belum ada sama sekali di Midtrans (user belum buka halaman bayar)
    if (error.status_code === '404') {
        return res.status(200).json({ data: { orderId, status: 'pending' } });
    }
    return res.status(500).json({ message: "Gagal memverifikasi status ke Midtrans" });
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
    const { 
      id, 
      status, 
      payment_type, 
      signature_key, 
      status_code, 
      gross_amount 
    } = notificationData;

    // --- 1. VALIDASI SIGNATURE KEY (WAJIB) ---
    // Ganti 'YOUR_SERVER_KEY' dengan Server Key Midtrans anda
    const serverKey = process.env.MIDTRANS_SERVER_KEY; 
    const hash = crypto.createHash('sha512')
      .update(`${id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (signature_key !== hash) {
      return res.status(400).json({ message: "Invalid Signature Key" });
    }

    // --- 2. CARI DATA TRANSAKSI ---
    const transaction = await Transaction.findByPk(id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    // Hindari memproses ulang transaksi yang sudah sukses/selesai
    if (transaction.status === 'success') {
      return res.status(200).json({ message: "Transaksi sudah sukses sebelumnya" });
    }

    // --- 3. LOGIKA PENENTUAN STATUS ---
    let newStatus = "pending";
    if (status === "capture" || status === "settlement") {
      newStatus = "success";
    } else if (["cancel", "expire", "deny"].includes(status)) {
      newStatus = "failed";
    } else if (status === "pending") {
      newStatus = "pending";
    }

    // --- 4. UPDATE TRANSACTION (Gunakan Transaction Sequelize jika memungkinkan) ---
    await Transaction.update(
      { 
        status: newStatus, 
        payment_method: payment_type 
      },
      { where: { id: order_id } }
    );

    // --- 5. LOGIKA BUSINESS (Hanya jika status berubah jadi success) ---
    if (newStatus === "success") {
      if (transaction.category === "subscription") {
        await User.update(
          { subscription_id: transaction.subscription_id },
          { where: { id: transaction.user_id } }
        );
      } else if (transaction.category === "avatar") {
        // Cek dulu apakah sudah punya agar tidak duplikat (Idempotency)
        const [userAvatar, created] = await UserAvatar.findOrCreate({
          where: { 
            user_id: transaction.user_id, 
            avatar_id: transaction.item_id 
          },
          defaults: { purchased_at: new Date() }
        });
      }
    }

    return res.status(200).json({ message: "OK", status: newStatus });

  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// const verifyPayment = async (req, res) => {
//   try {
//     const notificationData = req.body;
//     const { order_id, transaction_status, payment_type } = notificationData;

//     console.log("Midtrans Notification:", notificationData);

//     // 1. Cari Transaction by Order ID
//     const transaction = await Transaction.findOne({
//       where: { id: order_id },
//     });

//     if (!transaction) {
//       return res.status(404).json({
//         message: "Transaksi tidak ditemukan",
//       });
//     }

//     // 2. Tentukan status berdasarkan transaction_status dari Midtrans
//     let newStatus = "pending";
//     if (
//       transaction_status === "capture" ||
//       transaction_status === "settlement"
//     ) {
//       newStatus = "success";
//     } else if (transaction_status === "pending") {
//       newStatus = "pending";
//     } else if (
//       transaction_status === "cancel" ||
//       transaction_status === "expire" ||
//       transaction_status === "deny"
//     ) {
//       newStatus = "failed";
//     }

//     // 3. Update Transaction Status
//     await Transaction.update(
//       {
//         status: newStatus,
//         payment_method: payment_type,
//       },
//       {
//         where: { id: order_id },
//       }
//     );

//     // 4. Jika SUCCESS, lakukan action berdasarkan category
//     if (newStatus === "success") {
//       if (transaction.category === "subscription") {
//         // UPDATE User Subscription
//         if (transaction.subscription_id) {
//           await User.update(
//             { subscription_id: transaction.subscription_id },
//             { where: { id: transaction.user_id } }
//           );
//           console.log(
//             `User ${transaction.user_id} upgraded to subscription ${transaction.subscription_id}`
//           );
//         }
//       } else if (transaction.category === "avatar") {
//         // TAMBAH Avatar ke Inventory User (UserAvatar)
//         await UserAvatar.create({
//           user_id: transaction.user_id,
//           avatar_id: transaction.item_id,
//           purchased_at: new Date(),
//         });
//         console.log(
//           `User ${transaction.user_id} purchased avatar ${transaction.item_id}`
//         );
//       }
//     }

//     // 5. Response ke Midtrans (status 200)
//     return res.status(200).json({
//       message: "Notifikasi pembayaran diproses",
//       status: newStatus,
//     });
//   } catch (error) {
//     console.error("Verify Payment Error:", error);
//     return res.status(500).json({
//       message: `Gagal verifikasi payment - ${error.message}`,
//     });
//   }
// };

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
          if (transaction.category === "subscription" && transaction.subscription_id) {
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
        // 1. Join ke Subscription (Jika transaksinya beli paket)
        {
          model: Subscription,
          as: 'subscription_detail', // Pastikan alias ini ada di models/index.js
          attributes: ['status', 'price'],
        },
        // 2. Join ke Item (Jika transaksinya beli Avatar/Item)
        {
          model: Item,
          as: 'item_detail', // Pastikan alias ini ada di models/index.js
          attributes: ['name', 'price'],
        }
      ]
    });

    // FORMATTING DATA
    // Kita harus menentukan 'item_name' berdasarkan kategori
    const formattedData = transactions.map(t => {
      const trx = t.get({ plain: true }); // Ubah ke plain object
      let finalItemName = "Unknown Item";
      let finalItemPrice = null;

      // LOGIKANYA:
      if (trx.category === 'subscription') {
        if (trx.subscription_detail) {
          finalItemName = `Paket ${trx.subscription_detail.status}`;
          finalItemPrice = trx.subscription_detail.price;
        } else {
          finalItemName = "Paket (data tidak ditemukan)";
        }
      } else if (trx.category === 'item') {
        if (trx.item_detail) {
          finalItemName = trx.item_detail.name;
          finalItemPrice = trx.item_detail.price;
        } else {
          finalItemName = "Item (data tidak ditemukan)";
        }
      }

      return {
        ...trx,
        item_name: finalItemName, // <--- Ini yang dibaca Flutter
        item_price: finalItemPrice,
      };
    });

    res.status(200).json({ data: formattedData });
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

const getAllSubscriptionPlans = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      attributes: ["id_subs", "status", "price"],
      order: [["id_subs", "ASC"]],
    });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({
        message: "Tidak ada paket subscription yang tersedia",
      });
    }

    const plansData = subscriptions.map((sub) => ({
      id: sub.id_subs,
      name: sub.status,
      price: parseFloat(sub.price),
    }));

    return res.status(200).json({
      message: "Semua paket subscription berhasil diambil",
      data: plansData,
      total_plans: plansData.length,
    });
  } catch (error) {
    console.error("Get All Subscription Plans Error:", error);
    return res.status(500).json({
      message: `Gagal ambil semua paket subscription - ${error.message}`,
    });
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
  forceVerifyStatus,
  checkPaymentStatus,
  getPaymentHistory,
  cancelPayment,
  getAllSubscriptionPlans,
  getUserAvatars,
  setActiveAvatar,
};
