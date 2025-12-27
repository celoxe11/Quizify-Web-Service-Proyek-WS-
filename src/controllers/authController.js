const { User } = require("../models");
const admin = require("firebase-admin");
const { sequelize } = require("../models");

const generateNextId = async (role, transaction) => {
  const prefix = role === "teacher" ? "TE" : role === "student" ? "ST" : "AD";
  
  // Use raw query to get the MAX numeric ID for this role prefix
  // This is more reliable than ordering by created_at
  const [results] = await sequelize.query(
    `SELECT id FROM user WHERE id LIKE '${prefix}%' AND id REGEXP '^${prefix}[0-9]+$' ORDER BY CAST(SUBSTRING(id, 3) AS UNSIGNED) DESC LIMIT 1`,
    { transaction }
  );

  let number = 1;
  if (results && results.length > 0) {
    const lastId = results[0].id;
    const lastIdNum = parseInt(lastId.substring(2));
    if (!isNaN(lastIdNum)) {
      number = lastIdNum + 1;
    }
  }

  const newID = `${prefix}${number.toString().padStart(3, "0")}`;
  return newID;
};

// 1. REGISTER: Called once when the user signs up
// Replaces your old 'createUser' and old 'register'
const register = async (req, res) => {
  try {
    const { name, username, email, firebase_uid, role } = req.body;

    // 1. Check for duplicates EXPLICITLY
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({
        message: "Username sudah digunakan! Silakan gunakan username lain.",
      });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({
        message:
          "Email sudah terdaftar! Silakan gunakan email lain atau login.",
      });
    }

    const existingFirebaseUid = await User.findOne({ where: { firebase_uid } });
    if (existingFirebaseUid) {
      return res.status(400).json({
        message: "Akun Firebase sudah terdaftar! Silakan login.",
      });
    }

    // 2. Create User in MySQL with transaction (generate ID inside transaction)
    const newUser = await sequelize.transaction(async (t) => {
      // Generate ID within transaction to prevent race conditions
      const newID = await generateNextId(role, t);
      
      return await User.create(
        {
          id: newID,
          name,
          username,
          email,
          firebase_uid,
          role,
          subscription_id: 1,
          is_active: true,
        },
        { transaction: t }
      );
    });

    // 4. Set custom claims in Firebase
    await admin.auth().setCustomUserClaims(firebase_uid, {
      role: newUser.role,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Register Error:", error);

    // Handle specific error types
    if (error.name === "SequelizeUniqueConstraintError") {
      const duplicateField = error.errors[0]?.path;

      // Handle PRIMARY key error specifically
      if (duplicateField === "PRIMARY" || duplicateField === "id") {
        return res.status(400).json({
          message: "Terjadi kesalahan saat membuat ID unik. Silakan coba lagi.",
          field: "id",
        });
      }

      // Handle other unique constraints
      const fieldNames = {
        username: "Username",
        email: "Email",
        firebase_uid: "Akun Firebase",
      };
      const readableName = fieldNames[duplicateField] || duplicateField;

      return res.status(400).json({
        message: `${readableName} sudah digunakan! Silakan gunakan yang lain.`,
        field: duplicateField,
      });
    }

    res.status(500).json({
      message: `Internal server error - ${error.message}`,
    });
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
        return res
          .status(403)
          .json({ message: "Akun tidak aktif. Hubungi admin." });
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

    // 1. Check for duplicate email (username will be auto-generated with a random suffix if needed)
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({
        message: "Email sudah terdaftar dengan metode lain. Silakan login.",
      });
    }

    // 2. Generate unique username
    let finalUsername = username;
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      // If username taken, append random number
      const randomNum = Math.floor(Math.random() * 9999);
      finalUsername = `${username}${randomNum}`;
    }

    // 3. Create User in MySQL with transaction
    const newUser = await sequelize.transaction(async (t) => {
      // Generate ID within transaction to prevent race conditions
      const newID = await generateNextId(role, t);
      
      return await User.create(
        {
          id: newID,
          name,
          username: finalUsername, // Use the potentially modified username
          email,
          firebase_uid,
          role,
          subscription_id: 1,
          is_active: true,
        },
        { transaction: t }
      );
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

    if (error.name === "SequelizeUniqueConstraintError") {
      const duplicateField = error.errors[0]?.path || "unknown";
      const fieldNames = {
        username: "Username",
        email: "Email",
        firebase_uid: "Firebase UID",
      };
      const readableName = fieldNames[duplicateField] || duplicateField;

      return res.status(400).json({
        message: `${readableName} sudah digunakan!`,
        field: duplicateField,
      });
    }

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
