const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

const {User, Subscription, UserLog} = require("../models/index");

// Ambil log aktivitas user (dengan relasi ke User)
const getLog = async (req, res) => {
  const { user_id } = req.body;

  try {

    const logs = await UserLog.findAll({
      where: user_id ? { user_id } : {},
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          attributes: ["id", "name", "username"],
        },
      ],
    });

    if (logs.length === 0) {
      return res.status(404).json({ message: "Masih belum ada aktivitas" });
    }

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Update subscription user
const addToken = async (req, res) => {
  const schema = Joi.object({
    user_id: Joi.string().required().messages({
        "any.required": "user_id wajib diisi",
        "string.empty": "user_id tidak boleh kosong",
    }),
    subscription: Joi.string().required().messages({
        "any.required": "Subscription wajib diisi",
        "string.empty": "Subscription tidak boleh kosong",
    }),
  });


  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const { user_id, subscription } = value;

  try {
    const user = await User.findOne({
      where: { id: user_id },
      include: [Subscription],
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const subscriptionData = await Subscription.findOne({
      where: { status: subscription },
    });

    if (!subscriptionData) {
      return res.status(404).json({ message: "Subscription tidak ditemukan" });
    }

    user.subscription_id = subscriptionData.id_subs;
    await user.save();

    return res.status(200).json({
      message: `Subscription ${user.name} berhasil diperbarui`,
      subscription: subscriptionData.status,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", detail: error.message });
  }
};

// Ambil daftar user beserta subscription mereka
const getSubsList = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "username", "email", "role", "is_active"],
      include: [
        {
          model: Subscription,
          attributes: ["status"],
        },
      ],
      order: [[Subscription, "status", "DESC"]],
    });

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createTierList = async (req, res) => {
  const schema = Joi.object({
    status: Joi.string().trim().min(1).required().messages({
      "any.required": "Status wajib diisi",
      "string.empty": "Status tidak boleh kosong",
    }),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  try {
    // Trim ulang biar benar-benar bersih
    const statusTrimmed = value.status.trim();

    // Cek kalau status sudah ada, hindari duplikat
    const existing = await Subscription.findOne({ where: { status: statusTrimmed } });
    if (existing) {
      return res.status(409).json({ message: "Status subscription sudah ada" });
    }

    console.log('Status yang akan dibuat:', statusTrimmed);

    // Buat subscription dengan status yang sudah di-trim
    const newSubscription = await Subscription.create({ status: statusTrimmed });

    console.log('Subscription baru:', newSubscription.toJSON());

    return res.status(201).json({
      message: "Subscription berhasil dibuat",
      data: newSubscription,
    });
  } catch (error) {
    console.error('Error saat membuat subscription:', error);
    return res.status(500).json({ message: error.message });
  }
};



// Ambil semua tier subscription
const getTierList = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      attributes: ["id_subs", "status"],
    });

    return res.status(200).json(subscriptions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLog,
  addToken,
  getSubsList,
  createTierList,
  getTierList,
};
