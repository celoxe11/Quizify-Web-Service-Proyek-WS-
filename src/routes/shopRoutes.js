const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  getAllAvatars,
  getUserInventory,
  buyAvatar,
  equipAvatar,
} = require("../controllers/avatarController");

// Endpoint ini bisa diakses siapa saja yang login (Student/Teacher)
// 1. GET Semua Avatar (Katalog Toko)
router.get("/avatars", authenticate, getAllAvatars);

// 2. GET Inventory User (Milik Sendiri)
router.get("/inventory", authenticate, getUserInventory);

// 3. POST Beli Avatar
router.post("/buy", authenticate, buyAvatar);

// 4. POST Equip Avatar
router.post("/equip", authenticate, equipAvatar);

module.exports = router;
