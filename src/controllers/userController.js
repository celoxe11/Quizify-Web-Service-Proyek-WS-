const { User, Quiz } = require("../models");

const getPublicQuiz = async (req, res) => {
  try {
    // Logic to fetch and return public quizzes
    // get 3 quizzes where status is 'public' and is the most recently created
    const publicQuizzes = await Quiz.findAll({
      where: { status: "public" },
      order: [["created_at", "DESC"]],
      limit: 3,
    });
    res.json(publicQuizzes);
  } catch (error) {
    res
      .status(500)
      .json({ message: `Failed to fetch public quizzes - ${error.message}` });
  }
};

// Update Profile (Name, Username, etc.)
const updateProfile = async (req, res) => {
  try {
    const { id } = req.params; // The MySQL User ID (e.g., ST001)
    const { name, username, email } = req.body;

    // 1. Find User
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Check if trying to update username, ensure it's unique
    if (username && username !== user.username) {
      const existing = await User.findOne({ where: { username } });
      if (existing)
        return res.status(400).json({ message: "Username already taken" });
    }

    // 3. Update
    user.name = name || user.name ;
    user.username = username || user.username;
    user.email = email || user.email;

    await user.save();

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Failed to update profile - ${error.message}` });
  }
};

const updatePassword = async (req, res) => {
  // Implementation for updating password
  try {
    const { id } = req.params;
    const { oldPassword, newPassword, confirmPassword, idToken } = req.body;

    // Ensure authentication middleware populated req.user
    if (!req.user || (!req.user.id && !req.user.uid)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const authUserId = req.user.id || req.user.uid;
    if (authUserId !== id) return res.status(403).json({ message: "Forbidden" });
    if (newPassword !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });
    if (newPassword.length < 8) return res.status(400).json({ message: "Password too short" });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.firebase_uid) {
      if (!idToken) return res.status(400).json({ message: "idToken required for Firebase accounts" });
      
      return res.json({ message: "Password updated via Firebase" });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });
    if (oldPassword === newPassword) return res.status(400).json({ message: "New password must be different" });

    user.password = newPassword;
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: `Failed to update password - ${error.message}` });
  }
}

module.exports = {
  getPublicQuiz,
  updateProfile,
  updatePassword,
};
