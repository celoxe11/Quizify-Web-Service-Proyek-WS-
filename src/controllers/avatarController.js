const { Avatar, User, UserAvatar, Transaction } = require("../models");
const sequelize = require("../database/connection");
const Joi = require("joi");
const { Op } = require("sequelize");

// 1. GET ALL AVATARS (Termasuk yang soft-deleted agar admin bisa restore)
const getAllAvatars = async (req, res) => {
  try {
    const avatars = await Avatar.findAll({
      order: [["created_at", "DESC"]],
    });
    return res.status(200).json({ data: avatars });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 2. CREATE AVATAR
const createAvatar = async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().allow(null, "").optional(),
    image_url: Joi.string().uri().optional(), // OPTIONAL
    price: Joi.number().min(0).required(),
    rarity: Joi.string()
      .valid("common", "rare", "epic", "legendary")
      .required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "Validation error",
      detail: error.details[0].message,
    });
  }

  const transaction = await sequelize.transaction();

  try {
    let imageUrl = value.image_url || null;

    if (req.file) {
      imageUrl = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;
    }

    if (!imageUrl) {
      return res.status(400).json({
        message: "image_url atau file avatar wajib diisi",
      });
    }

    const newAvatar = await Avatar.create(
      {
        name: value.name,
        description: value.description,
        image_url: imageUrl, // ← PAKAI INI
        price: value.price,
        rarity: value.rarity,
        is_active: true,
      },
      { transaction },
    );

    await transaction.commit();

    return res.status(201).json({
      message: "Avatar berhasil dibuat",
      data: newAvatar,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("CREATE AVATAR ERROR:", err.message, err);
    return res.status(500).json({
      message: "Gagal membuat avatar",
      detail: err.message,
    });
  }
};

// 3. UPDATE AVATAR
const updateAvatar = async (req, res) => {
  const { id } = req.params;
  try {
    const avatar = await Avatar.findByPk(id);
    if (!avatar) return res.status(404).json({ message: "Avatar not found" });

    // Update fields
    if (req.body.name) avatar.name = req.body.name;
    if (req.body.price) avatar.price = req.body.price;
    if (req.body.rarity) avatar.rarity = req.body.rarity;
    if (req.body.image_url) avatar.image_url = req.body.image_url;

    // Restore jika di-update statusnya
    if (req.body.is_active !== undefined) avatar.is_active = req.body.is_active;

    await avatar.save();
    return res.status(200).json({ message: "Avatar updated", data: avatar });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 4. SOFT DELETE (Set is_active = 0)
const deleteAvatar = async (req, res) => {
  const { id } = req.params;
  try {
    const avatar = await Avatar.findByPk(id);
    if (!avatar) return res.status(404).json({ message: "Avatar not found" });

    // Toggle Status (Kalau aktif jadi mati, kalau mati jadi aktif)
    // Atau paksa mati: avatar.is_active = 0;
    avatar.is_active = !avatar.is_active;

    await avatar.save();

    const statusMsg = avatar.is_active ? "Restored" : "Soft Deleted";
    return res
      .status(200)
      .json({ message: `Avatar ${statusMsg}`, data: avatar });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getUserInventory = async (req, res) => {
  try {
    // Ambil ID user yang sedang login dari Token
    const userId = req.user.id || req.user.uid;

    const user = await User.findOne({
      where: {
        // [FIX] Cari user berdasarkan ID (Internal) ATAU Firebase UID
        [Op.or]: [{ id: userId }, { firebase_uid: userId }],
      },
      attributes: ["id", "name", "current_avatar_id"],
      include: [
        {
          model: Avatar,
          as: "inventory", // Pastikan alias ini sesuai dengan models/index.js
          attributes: ["id", "name", "image_url", "rarity", "price"],
          through: {
            attributes: ["purchased_at"],
          },
        },
      ],
    });

    if (!user) {
      console.log("User not found in DB for ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    // Format data agar Frontend mudah membacanya
    const formattedInventory = user.inventory.map((avatar) => {
      const av = avatar.toJSON();
      return {
        id: av.id,
        name: av.name,
        image_url: av.image_url,
        rarity: av.rarity,
        price: parseFloat(av.price),
        purchased_at: av.UserAvatar.purchased_at,
        // Cek apakah avatar ini sedang dipakai?
        is_equipped: user.current_avatar_id === av.id,
      };
    });

    return res.status(200).json({
      message: "Inventory fetched successfully",
      data: formattedInventory,
    });
  } catch (error) {
    console.error("Get Inventory Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// [BARU] EQUIP AVATAR (Ganti Avatar Aktif)
const equipAvatar = async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    const { avatar_id } = req.body;

    const user = await User.findOne({
      where: {
        // [FIX] Cari di kolom ID (Internal) ATAU firebase_uid
        [Op.or]: [{ id: userId }, { firebase_uid: userId }],
      },
      include: [{ model: Avatar, as: "inventory" }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Cek apakah user MEMILIKI avatar tersebut di inventory-nya?
    const hasAvatar = user.inventory.some((a) => a.id === parseInt(avatar_id));

    if (!hasAvatar) {
      return res.status(403).json({ message: "You do not own this avatar!" });
    }

    // Update Avatar Aktif
    user.current_avatar_id = avatar_id;
    await user.save();

    return res.status(200).json({
      message: "Avatar equipped successfully",
      current_avatar_id: avatar_id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const buyAvatar = async (req, res) => {
  try {
    const { avatar_id } = req.body;
    const userId = req.user.id || req.user.uid;

    const avatar = await Avatar.findByPk(avatar_id);
    if (!avatar) return res.status(404).json({ message: "Avatar not found" });

    if (avatar.is_active === 0) {
      return res.status(403).json({ message: "Avatar is not active" });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.points < avatar.price) {
      return res.status(403).json({ message: "Insufficient points" });
    }

    // Generate Transaction ID
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
    const transactionId = `TR${String(newNum).padStart(3, "0")}`;

    user.points -= parseInt(avatar.price);

    await user.save();

    await UserAvatar.create({
      user_id: userId,
      avatar_id: avatar_id,
      purchased_at: new Date(),
    });

    await Transaction.create({
      id: transactionId,
      user_id: userId,
      item_id: avatar_id,
      category: "item",
      amount: avatar.price,
      status: "success",
      payment_method: "points",
    });

    return res.status(200).json({
      message: "Avatar bought successfully",
      current_avatar_id: avatar_id,
    });
  } catch (error) {
    console.error("Buy Avatar Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllAvatars,
  createAvatar,
  updateAvatar,
  deleteAvatar,
  getUserInventory,
  equipAvatar,
  buyAvatar,
};
