const express = require('express');

const { redeem, log, logout } = require('../controllers/authController');
const { authenticate, isUser, isAdmin, cekLogin } = require('../middleware/authMiddleware');
const router = express.Router();
router.get('/log', authenticate,isAdmin, cekLogin, log);
router.post('/logout', authenticate, cekLogin, logout);
module.exports = router;