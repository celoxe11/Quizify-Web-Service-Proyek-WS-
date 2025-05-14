const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
dotenv.config();

const authenticate = (req, res, next) => {
  const authHeader = req.header("Authorization");
  console.log("Auth header:", authHeader);

  if (!authHeader) return res.status(401).json({ message: "Access denied" });

  // Extract token from "Bearer [token]" format
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    res.status(400).json({ message: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  next();
};

module.exports = { authenticate, isAdmin };
