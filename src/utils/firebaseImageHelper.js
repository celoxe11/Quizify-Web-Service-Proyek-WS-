const { bucket } = require("../config/firebase");

/**
 * Upload a base64 image to Firebase Cloud Storage
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} userId - User ID for folder organization
 * @param {string} questionId - Question ID for filename
 * @returns {Promise<{firebaseUrl: string, firebasePath: string}>}
 */
const uploadBase64ToFirebase = async (base64Data, userId, questionId) => {
  try {
    // Remove data URI prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `question_${questionId}_${timestamp}_${randomString}.png`;
    const firebasePath = `questions/${userId}/${filename}`;

    // Create a reference to the file in Firebase Storage
    const blob = bucket.file(firebasePath);

    // Upload the file with public read access
    await blob.save(buffer, {
      metadata: {
        contentType: "image/png",
        cacheControl: "public, max-age=31536000",
        metadata: {
          userId: userId,
          questionId: questionId,
          uploadedAt: new Date().toISOString(),
        },
      },
      public: true, // Make file public on upload
      resumable: false,
    });

    // Make the file public (double ensure)
    await blob.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebasePath}`;

    return {
      firebaseUrl: publicUrl,
      firebasePath: firebasePath,
    };
  } catch (error) {
    console.error("Error uploading base64 to Firebase:", error);
    throw error;
  }
};

/**
 * Delete a file from Firebase Cloud Storage
 * @param {string} fileUrl - Firebase URL or path
 * @returns {Promise<void>}
 */
const deleteFileFromFirebase = async (fileUrl) => {
  try {
    if (!fileUrl) return;

    // Extract the path from URL if a full URL is provided
    let filePath = fileUrl;

    // Handle different URL formats
    if (fileUrl.includes("storage.googleapis.com")) {
      const urlParts = fileUrl.split(`${bucket.name}/`);
      filePath = urlParts[1] || fileUrl;
    } else if (fileUrl.startsWith("/uploads/")) {
      // Old format - skip deletion for now
      console.log("Skipping deletion of old format URL:", fileUrl);
      return;
    } else if (fileUrl.startsWith("/api/uploads/")) {
      // Old format - skip deletion for now
      console.log("Skipping deletion of old format URL:", fileUrl);
      return;
    }

    const file = bucket.file(filePath);

    // Check if file exists before deleting
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      console.log(`Successfully deleted file from Firebase: ${filePath}`);
    } else {
      console.log(`File not found in Firebase: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file from Firebase: ${error.message}`);
    // Don't throw error, just log it
  }
};

/**
 * Check if a URL is a Firebase Storage URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
const isFirebaseUrl = (url) => {
  if (!url) return false;
  return url.includes("storage.googleapis.com") || url.startsWith("questions/");
};

module.exports = {
  uploadBase64ToFirebase,
  deleteFileFromFirebase,
  isFirebaseUrl,
};
