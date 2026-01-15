const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getAllAvatars, getUserInventory, equipAvatar } = require('../controllers/avatarController');

// Endpoint ini bisa diakses siapa saja yang login (Student/Teacher)
// 1. GET Semua Avatar (Katalog Toko)
router.get("/avatars", authenticate, getAllAvatars);

// 2. GET Inventory User (Milik Sendiri)
router.get("/inventory", authenticate, getUserInventory);

// 3. POST Beli Avatar
// (Anda perlu buat fungsi buyAvatar di controller nanti)
// router.post("/buy", authenticate, avatarController.buyAvatar);

// 4. POST Equip Avatar
router.post("/equip", authenticate, equipAvatar);

module.exports = router;