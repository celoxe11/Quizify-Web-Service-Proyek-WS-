const multer = require("multer");
const path = require("path");
const { bucket } = require("../config/firebase");
const { QuestionImage } = require("../models");

// Use memory storage to keep files in memory before uploading to Firebase
const memoryStorage = multer.memoryStorage();

// File filter for question images
const fileFilter = (req, file, callback) => {
  const allowed = /jpeg|jpg|png/;
  const valid =
    allowed.test(file.mimetype) &&
    allowed.test(path.extname(file.originalname).toLowerCase());
  callback(
    valid ? null : new Error("File harus berupa gambar (jpeg/jpg/png)"),
    valid,
  );
};

// Multer configuration
const multerUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1, // Only allow 1 file per upload
  },
  fileFilter,
});

/**
 * Create a wrapper to handle errors from multer
 */
const upload = (field) => {
  return (req, res, next) => {
    const singleUpload = multerUpload.single(field);

    singleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // Multer-specific errors
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              message: "Ukuran file terlalu besar. Maksimal 5MB",
            });
          } else if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
              message: "Hanya boleh mengupload 1 file gambar",
            });
          } else {
            // Handle any other multer errors
            return res.status(400).json({
              message: `Error uploading file: ${err.code}`,
            });
          }
        }
        // Other errors (like file type not allowed)
        return res.status(400).json({ message: err.message });
      }

      // If there's no file but the field was provided, it might be multiple files
      if (req.body[field] && !req.file) {
        if (Array.isArray(req.body[field])) {
          return res.status(400).json({
            message: "Hanya boleh mengupload 1 file gambar",
          });
        }
      }

      next();
    });
  };
};

/**
 * Middleware to upload question image to Firebase Cloud Storage
 * This should be used after multer middleware
 */
const uploadToFirebase = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(); // No file uploaded, continue
    }

    const userId = req.user?.id || "anonymous";

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const timestamp = Date.now();
    const filename = `question-${timestamp}${ext}`;
    const firebasePath = `questions/${userId}/${filename}`;

    // Create a reference to the file in Firebase Storage
    const blob = bucket.file(firebasePath);

    // Create a write stream
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: timestamp,
          userId: userId,
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
        // Make the file public
        await blob.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

        // Attach the URL to the request object for use in controllers
        req.file.firebaseUrl = publicUrl;
        req.file.firebasePath = blob.name;
        req.file.filename = filename;

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
    console.error("Error in uploadToFirebase:", error);
    return res.status(500).json({
      message: "Error uploading file",
      error: error.message,
    });
  }
};

/**
 * Middleware to replace question image in Firebase Cloud Storage
 * This deletes the old image and uploads the new one
 */
const replaceQuestionImageFirebase = () => async (req, res, next) => {
  if (!req.file) {
    return next(); // No new file uploaded, continue
  }

  try {
    const userId = req.user?.id || "anonymous";
    const questionId = req.body.question_id;

    if (!questionId) {
      return res.status(400).json({
        message: "ID pertanyaan diperlukan untuk mengupdate gambar",
      });
    }

    // Find existing image for this question
    const existingImage = await QuestionImage.findOne({
      where: {
        question_id: questionId,
        user_id: userId,
      },
    });

    // Generate new filename
    const ext = path.extname(req.file.originalname);
    const timestamp = Date.now();
    const filename = `question-${timestamp}${ext}`;
    const firebasePath = `questions/${userId}/${filename}`;

    // Upload new file to Firebase
    const blob = bucket.file(firebasePath);

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: timestamp,
          userId: userId,
          questionId: questionId,
        },
      },
      resumable: false,
    });

    blobStream.on("error", (error) => {
      console.error("Error uploading to Firebase:", error);
      return res.status(500).json({
        message: "Error uploading file to cloud storage",
        error: error.message,
      });
    });

    blobStream.on("finish", async () => {
      try {
        // Make the file public
        await blob.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

        // Attach the URL to the request object
        req.file.firebaseUrl = publicUrl;
        req.file.firebasePath = blob.name;
        req.file.filename = filename;

        // Delete old image from Firebase if it exists
        if (existingImage && existingImage.image_url) {
          try {
            await deleteFileFromFirebase(existingImage.image_url);
            console.log("Old image deleted successfully");
          } catch (err) {
            console.error("Failed to delete old image:", err);
            // Continue even if deletion fails
          }
        }

        // Store old image info for controller
        req.oldImage = existingImage;

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
    console.error("Error in replaceQuestionImageFirebase:", error);
    return res.status(500).json({
      message: "Error saat mengganti gambar",
      error: error.message,
    });
  }
};

/**
 * Helper function to delete a file from Firebase Storage
 * @param {string} filePath - The path or URL of the file in Firebase Storage
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

// Middleware for parsing form (kept for backward compatibility)
const parseForm = (fieldName) => {
  return upload(fieldName);
};

// Middleware to save file (now uploads to Firebase)
const saveFile = () => uploadToFirebase;

module.exports = {
  upload,
  parseForm,
  saveFile: () => uploadToFirebase,
  replaceQuestionImage: replaceQuestionImageFirebase,
  uploadToFirebase,
  deleteFileFromFirebase,
};
