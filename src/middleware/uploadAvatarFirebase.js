const path = require("path");
const { bucket } = require("../config/firebase");

/**
 * Middleware to upload avatar to Firebase Cloud Storage
 * This should be used after multer middleware
 */
const uploadAvatarToFirebase = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(); // No file uploaded, continue
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const uniqueName = `avatars/avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    // Create a reference to the file in Firebase Storage
    const blob = bucket.file(uniqueName);

    // Create a write stream
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: Date.now(), // This helps with cache busting
        },
      },
      resumable: false, // For small files, non-resumable is faster
    });

    // Handle errors
    blobStream.on("error", (error) => {
      console.error("Error uploading to Firebase:", error);
      return res.status(500).json({
        message: "Error uploading file to cloud storage",
        error: error.message,
      });
    });

    // Handle successful upload
    blobStream.on("finish", async () => {
      try {
        // Make the file public (optional - remove if you want private files)
        await blob.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

        // Attach the URL to the request object for use in controllers
        req.file.firebaseUrl = publicUrl;
        req.file.firebasePath = blob.name; // Store the path for deletion later

        next();
      } catch (error) {
        console.error("Error making file public:", error);
        return res.status(500).json({
          message: "Error processing uploaded file",
          error: error.message,
        });
      }
    });

    // Write the file buffer to Firebase Storage
    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error("Error in uploadAvatarToFirebase:", error);
    return res.status(500).json({
      message: "Error uploading file",
      error: error.message,
    });
  }
};

/**
 * Middleware to replace an existing avatar in Firebase Cloud Storage
 * This uploads a new file and deletes the old one
 * Use this for avatar updates
 */
const replaceAvatarInFirebase = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(); // No new file uploaded, continue
    }

    // Get the avatar ID from params
    const avatarId = req.params.id;
    let oldImageUrl = null;

    // Try to get old image URL from database
    if (avatarId) {
      try {
        // Import Avatar model
        const { Avatar } = require("../models");
        const existingAvatar = await Avatar.findByPk(avatarId);

        if (existingAvatar && existingAvatar.image_url) {
          oldImageUrl = existingAvatar.image_url;
          console.log("Found old image URL:", oldImageUrl);
        }
      } catch (dbError) {
        console.error("Error fetching old avatar from DB:", dbError);
        // Continue anyway - we'll just upload the new file
      }
    }

    // If not found in DB, try to get from request body (fallback)
    if (!oldImageUrl && req.body.old_image_url) {
      oldImageUrl = req.body.old_image_url;
    }

    // Generate unique filename for new image
    const ext = path.extname(req.file.originalname);
    const uniqueName = `avatars/avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    // Create a reference to the new file in Firebase Storage
    const blob = bucket.file(uniqueName);

    // Create a write stream
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: Date.now(),
        },
      },
      resumable: false,
    });

    // Handle errors
    blobStream.on("error", (error) => {
      console.error("Error uploading to Firebase:", error);
      return res.status(500).json({
        message: "Error uploading file to cloud storage",
        error: error.message,
      });
    });

    // Handle successful upload
    blobStream.on("finish", async () => {
      try {
        // Make the new file public
        await blob.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

        // Attach the URL to the request object
        req.file.firebaseUrl = publicUrl;
        req.file.firebasePath = blob.name;

        // Delete the old image if it exists
        if (oldImageUrl) {
          try {
            await deleteFileFromFirebase(oldImageUrl);
            console.log("Old avatar image deleted successfully:", oldImageUrl);
          } catch (err) {
            console.error("Failed to delete old avatar image:", err);
            // Continue even if deletion fails
          }
        } else {
          console.log("No old image to delete");
        }

        next();
      } catch (error) {
        console.error("Error processing uploaded file:", error);
        return res.status(500).json({
          message: "Error processing uploaded file",
          error: error.message,
        });
      }
    });

    // Write the file buffer to Firebase Storage
    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error("Error in replaceAvatarInFirebase:", error);
    return res.status(500).json({
      message: "Error replacing avatar image",
      error: error.message,
    });
  }
};

/**
 * Helper function to delete a file from Firebase Storage
 * @param {string} filePath - The path of the file in Firebase Storage
 */
const deleteFileFromFirebase = async (filePath) => {
  try {
    if (!filePath) return;

    // Extract the path from URL if a full URL is provided
    let path = filePath;
    if (filePath.includes("storage.googleapis.com")) {
      const urlParts = filePath.split(`${bucket.name}/`);
      path = urlParts[1] || filePath;
    }

    const file = bucket.file(path);
    await file.delete();
    console.log(`Successfully deleted file: ${path}`);
  } catch (error) {
    console.error(`Error deleting file from Firebase: ${error.message}`);
    // Don't throw error, just log it
  }
};

module.exports = {
  replaceAvatarInFirebase,
  uploadAvatarToFirebase,
  deleteFileFromFirebase,
};
