const jwt = require("jsonwebtoken");
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
  const token = req.header("x-access-token");

  if (!token) {
    return sendHttpCatImage(res, 401);  // Ganti json dengan image http.cat 401
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (decoded.role === "admin") {
      if (
        decoded.username === process.env.ADMIN_USERNAME &&
        decoded.password === process.env.ADMIN_PASSWORD
      ) {
        req.user = {
          id: "admin",
          username: decoded.username,
          role: "admin",
        };
        return next();
      } else {
        return sendHttpCatImage(res, 403);  // Ganti json dengan image http.cat 403
      }
    }

    const userId = decoded.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return sendHttpCatImage(res, 404);  // Ganti json dengan image http.cat 404
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    return sendHttpCatImage(res, 400);  // Ganti json dengan image http.cat 400
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
