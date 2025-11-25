const admin = require("firebase-admin");

// This middleware protects your routes
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Verify the token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach the user info to the request object
    req.user = decodedToken;

    next(); // Proceed to the next controller
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Unauthorized", error: error.message });
  }
};

module.exports = verifyToken;
