const express = require("express");

const {
  getLog,
  getSubsList,
  createTierList,
  getTierList,
  userSubscription,
} = require("../controllers/adminController");

const logActivity = require("../middleware/logActivity");
const { authenticate, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();
router.get(
  "/logaccess",
  authenticate,
  logActivity("Admin View Log Access"),
  isAdmin,
  getLog
);
router.put(
  "/token",
  authenticate,
  logActivity("Admin: View Log Access"),
  isAdmin,
  userSubscription
);
router.get(
  "/users",
  authenticate,
  logActivity("Admin: View Users"),
  isAdmin,
  getSubsList
);
router.post(
  "/tierlist",
  authenticate,
  logActivity("Admin: Create Tier List"),
  isAdmin,
  createTierList
);
router.get(
  "/tierlist",
  authenticate,
  logActivity("Admin: View Tier List"),
  isAdmin,
  getTierList
);

module.exports = router;
