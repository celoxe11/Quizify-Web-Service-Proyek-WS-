const { User } = require("../models");

// 1. REGISTER: Called once when the user signs up
// Replaces your old 'createUser' and old 'register'
const register = async (req, res) => {
  try {
    const { name, username, email, firebase_uid, role } = req.body;

    // 1. Check for duplicates (Username)
    // Note: Email is already checked by Firebase, but checking here is safe too.
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ message: "Username sudah digunakan!" });
    }

    // 2. ID Generation Logic (TE001, ST001)
    const lastUser = await User.findOne({
      order: [["created_at", "DESC"]],
      where: { role },
    });

    let number = 1;
    if (lastUser) {
      // Extract number from ID (e.g., TE005 -> 5)
      const lastIdNum = parseInt(lastUser.id.slice(2));
      if (!isNaN(lastIdNum)) {
        number = lastIdNum + 1;
      }
    }

    const prefix = role === "teacher" ? "TE" : "ST";
    const newID = `${prefix}${number.toString().padStart(3, "0")}`;

    // 3. Create User in MySQL
    const newUser = await User.create({
      id: newID,
      name,
      username,
      email,
      firebase_uid, // Links to Firebase
      role,
      subscription_id: 1, // Default Free
      is_active: true,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Register Error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        message: "Data duplicate detected",
        details: error.errors.map((e) => e.message),
      });
    }
    res
      .status(500)
      .json({ message: `Internal server error - ${error.message}` });
  }
};

// 2. ME: get users MySQL data by firebase_uid
// Replaces 'getUserByFirebaseUid'
// Bisa buat ambil data profile setelah login
const me = async (req, res) => {
  try {
    // The firebase_uid comes from the route parameter or the verified token (req.user.uid)
    // It is safer to use req.user.uid from the middleware if available, but params work too.
    const firebaseUid = req.user.uid;

    const user = await User.findOne({ where: { firebase_uid: firebaseUid } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found in database. Please register." });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Account is inactive" });
    }

    res.json(user);
  } catch (error) {
    console.error("Login Fetch Error:", error);
    res
      .status(500)
      .json({ message: `Internal server error - ${error.message}` });
  }
};

module.exports = {
  register,
  me,
};
