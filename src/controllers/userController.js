const { User } = require("../models");

const createUser = async (req, res) => {
  try {
    const { id, name, username, email, firebase_uid, role, subscription_id } = req.body;

    const user = await User.create({
      id,
      name,
      username,
      email,
      firebase_uid,
      role,
      subscription_id,
    });

    res.status(201).json(user);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ error: "Unique constraint error", details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ error: error.message });
  }
};

const getUserByFirebaseUid = async (req, res) => {
  try {
    const user = await User.findOne({ where: { firebase_uid: req.params.firebaseUid } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const generateUniqueUserId = async (req, res) => {
  const id = "U" + Date.now().toString().slice(-9);
  res.json({ id });
};

module.exports = {
  createUser,
  getUserByFirebaseUid,
  generateUniqueUserId,
};
