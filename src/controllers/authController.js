const { User } = require("../models");
const admin = require("firebase-admin");

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

    await admin.auth().setCustomUserClaims(firebase_uid, {
      role: newUser.role,
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

    const currentRoleClaim = req.user.role;
    if (currentRoleClaim !== user.role) {
      await admin.auth().setCustomUserClaims(firebaseUid, {
        role: user.role,
      });
      // Note: The Flutter client must refresh its token to pick up this change.
    }

    res.json(user);
  } catch (error) {
    console.error("Login Fetch Error:", error);
    res
      .status(500)
      .json({ message: `Internal server error - ${error.message}` });
  }
};

// 3. GOOGLE SIGN-IN: Handles both new Google users and returning Google users
const googleSignIn = async (req, res) => {
  try {
    const { name, email, firebase_uid, username, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ where: { firebase_uid } });

    if (user) {
      // Existing user - just return their data
      if (!user.is_active) {
        return res.status(403).json({ message: "Account is inactive" });
      }

      // Sync custom claims if needed
      const currentRoleClaim = req.user?.role;
      if (currentRoleClaim !== user.role) {
        await admin.auth().setCustomUserClaims(firebase_uid, {
          role: user.role,
        });
      }

      return res.json({ user });
    }

    // New user - create them (similar to register logic)

    // 1. Check for duplicate username
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      // If username taken, append random number
      const randomNum = Math.floor(Math.random() * 9999);
      username = `${username}${randomNum}`;
    }

    // 2. ID Generation Logic (TE001, ST001)
    const lastUser = await User.findOne({
      order: [["created_at", "DESC"]],
      where: { role },
    });

    let number = 1;
    if (lastUser) {
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
      firebase_uid,
      role,
      subscription_id: 1,
      is_active: true,
    });

    // 4. Set custom claims
    await admin.auth().setCustomUserClaims(firebase_uid, {
      role: newUser.role,
    });

    res.status(201).json({
      message: "Google user registered successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    res.status(500).json({
      message: `Internal server error - ${error.message}`,
    });
  }
};

// Check if a Google user exists in the database
const checkGoogleUserExists = async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    console.log("testing firebaseUid:", firebaseUid);

    const user = await User.findOne({ where: { firebase_uid: firebaseUid } });

    if (user) {
      // User exists - return their data
      if (!user.is_active) {
        return res.status(403).json({
          exists: true,
          message: "Account is inactive",
        });
      }

      return res.json({
        exists: true,
        user: user,
      });
    }

    // User doesn't exist
    res.json({ exists: false });
  } catch (error) {
    console.error("Check Google User Error:", error);
    res.status(500).json({
      message: `Internal server error - ${error.message}`,
    });
  }
};

module.exports = {
  register,
  me,
  googleSignIn,
  checkGoogleUserExists,
};
