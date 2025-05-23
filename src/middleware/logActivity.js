const { UserLog } = require("../models");

const logActivity = (actionType) => {
  return async (req, res, next) => {
    try {
        console.log(req.user);
        
      const userId = req.user.id;
      if (userId) {
        await UserLog.create({
          user_id: userId,
          action_type: actionType,
          endpoint: `[${req.method}] ${req.originalUrl}`,
        });
      }
    } catch (err) {
      // Tidak menghentikan request walau logging gagal
      console.error("Failed to log activity:", err.message);
      return res.status(500).json({
        message: err.message,
      });
    }
    next();
  };
};

module.exports = logActivity;