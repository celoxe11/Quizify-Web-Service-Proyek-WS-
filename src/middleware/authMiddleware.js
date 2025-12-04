const admin = require("firebase-admin");
const User = require("../models/User");
const dotenv = require("dotenv");
const axios = require('axios');

dotenv.config();


const sendHttpCatImage = async (res, statusCode) => {
  try {
    const response = await axios.get(`https://http.cat/${statusCode}`, { responseType: 'arraybuffer' });
    res.status(statusCode);
    res.set('Content-Type', 'image/jpeg');
    res.send(response.data);
  } catch (error) {
    // Kalau gagal ambil gambar http.cat, fallback ke JSON error biasa
    res.status(statusCode).json({ message: `Error ${statusCode}` });
  }
};

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return sendHttpCatImage(res, 401);  // No token provided
  }

  try {
    // Verify the token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Get the role from custom claims
    const role = decodedToken.role;

    // Handle admin case if you still need it
    if (role === "admin") {
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: "admin",
      };
      return next();
    }

    // For regular users (teacher/student), fetch from MySQL using firebase_uid
    const user = await User.findOne({ where: { firebase_uid: decodedToken.uid } });

    if (!user) {
      return sendHttpCatImage(res, 404);  // User not found in database
    }

    if (!user.is_active) {
      return sendHttpCatImage(res, 403);  // Account is inactive
    }

    // Attach both Firebase token data and MySQL user data to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: user.role,
      dbUser: user,  // Full MySQL user object
    };

    next();
  } catch (error) {
    console.error("Firebase token verification error:", error.message);
    return sendHttpCatImage(res, 403);  // Unauthorized
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return sendHttpCatImage(res, 403);
  }
  next();
};

const isTeacher = (req, res, next) => {
  if (!req.user || req.user.role !== "teacher") {
    return sendHttpCatImage(res, 403);
  }
  next();
};

const isStudent = (req, res, next) => {
  if (!req.user || req.user.role !== "student") {
    return sendHttpCatImage(res, 403);
  }
  next();
};

module.exports = { authenticate, isAdmin, isTeacher, isStudent };
