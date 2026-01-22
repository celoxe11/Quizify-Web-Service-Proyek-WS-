const admin = require("firebase-admin");

let bucket;

try {
  // Only initialize if not already initialized
  if (admin.apps.length === 0) {
    try {
      // Try to use service account key file (for local development)
      const serviceAccount = require("../../serviceAccountKey.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.STORAGE_BUCKET_NAME,
      });
      console.log("Firebase Admin initialized with service account");
    } catch (e) {
      // If service account file is missing (common in production), use default credentials
      admin.initializeApp({
        storageBucket: process.env.STORAGE_BUCKET_NAME,
      });
      console.log("Firebase Admin initialized with default credentials");
    }
  } else {
    console.log("Firebase Admin already initialized");
  }

  // Get the storage bucket (use default bucket from initialization)
  bucket = admin.storage().bucket();
  console.log("Firebase Storage bucket configured successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  console.error("Make sure STORAGE_BUCKET_NAME is set in .env");
}

module.exports = { admin, bucket };
