const { User } = require("../models");

// Update Profile (Name, Username, etc.)
const updateProfile = async (req, res) => {
  try {
    const { id } = req.params; // The MySQL User ID (e.g., ST001)
    const { name, username } = req.body;

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
    user.name = name || user.name;
    user.username = username || user.username;

    await user.save();

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Failed to update profile - ${error.message}` });
  }
};

module.exports = {
  updateProfile,
};
