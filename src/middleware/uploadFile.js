const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    const userId = req.user?.id || "anonymous";
    const dir = path.join(__dirname, "../uploads", userId.toString());

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    callback(null, dir);
  },
  filename: function (req, file, callback) {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    callback(null, `question-${timestamp}${ext}`);
  },
});

const fileFilter = (req, file, callback) => {
  const allowed = /jpeg|jpg|png/;
  const valid = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
  callback(valid ? null : new Error("File harus berupa gambar (jpeg/jpg/png)"), valid);
};

const multerUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1, // Only allow 1 file per upload
  },
  fileFilter
});

// Create a wrapper to handle errors from multer
const upload = (field) => {
  return (req, res, next) => {
    const singleUpload = multerUpload.single(field);
    
    singleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // Multer-specific errors
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              message: "Ukuran file terlalu besar. Maksimal 5MB" 
            });
          } 
          else if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
              message: "Hanya boleh mengupload 1 file gambar" 
            });
          }
          else {
            // Handle any other multer errors
            return res.status(400).json({ 
              message: `Error uploading file: ${err.code}` 
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
            message: "Hanya boleh mengupload 1 file gambar" 
          });
        }
      }
      
      next();
    });
  };
};

module.exports = upload;