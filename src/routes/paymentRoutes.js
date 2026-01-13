const express = require("express");
const {
  createPayment,
  verifyPayment,
  checkPaymentStatus,
  getPaymentHistory,
  cancelPayment,
  getPlanPackageFeatures,
  getUserAvatars,
  setActiveAvatar,
} = require("../controllers/paymentController");

const { authenticate } = require("../middleware/authMiddleware");
const logActivity = require("../middleware/logActivity");
const validateMidtransSignature = require("../middleware/validateMidtransSignature");

const router = express.Router();

// ===== SUBSCRIPTION & AVATAR PAYMENT =====

/**
 * POST /api/payment/create
 * Create payment snap token untuk subscription atau avatar
 * Body: { type: 'subscription' | 'avatar', subscription_id OR avatar_id, payment_method }
 */
router.post(
  "/create",
  authenticate,
  logActivity("Payment: Create"),
  createPayment
);

/**
 * POST /api/payment/verify (Webhook dari Midtrans)
 * Tidak perlu authentication karena dari Midtrans
 */
router.post("/verify", validateMidtransSignature, verifyPayment);

/**
 * GET /api/payment/status/:order_id
 * Check payment status
 */
router.get(
  "/status/:order_id",
  authenticate,
  logActivity("Payment: Check Status"),
  checkPaymentStatus
);

/**
 * GET /api/payment/history
 * Get user's payment history
 */
router.get(
  "/history",
  authenticate,
  logActivity("Payment: Get History"),
  getPaymentHistory
);

/**
 * POST /api/payment/cancel/:order_id
 * Cancel pending payment
 */
router.post(
  "/cancel/:order_id",
  authenticate,
  logActivity("Payment: Cancel Payment"),
  cancelPayment
);

router.get(
  "/subscription/packages/features",
  authenticate,
  logActivity("Payment: Get Package Features"),
  getPlanPackageFeatures
);

// ===== AVATAR MANAGEMENT =====

/**
 * GET /api/payment/my-avatars
 * Ambil daftar avatar yang sudah dimiliki user
 */
router.get(
  "/my-avatars",
  authenticate,
  logActivity("Payment: Get My Avatars"),
  getUserAvatars
);

/**
 * PUT /api/payment/set-avatar/:avatar_id
 * Ganti avatar aktif user
 */
router.put(
  "/set-avatar/:avatar_id",
  authenticate,
  logActivity("Payment: Set Active Avatar"),
  setActiveAvatar
);

module.exports = router;
