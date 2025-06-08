const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { QuestionImage } = require("../models");

const memoryStorage = multer.memoryStorage();

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

// middleware untuk parse form data tapi tidak menyimpan file ke disk (disimpan di memory)
const parseForm = (fieldName) => {
  return multer({ 
    storage: memoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  }).single(fieldName);
};

// middleware untuk simpan file dari memory ke disk
const saveFile = () => async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  
  try {
    // ambil user ID dari request, atau gunakan "anonymous" jika tidak ada
    const userId = req.user?.id || "anonymous";
    
    // direktory
    const userDir = path.join(__dirname, "../uploads", userId.toString());
    
    // cgeck jika direktori tidak ada, buat jika perlu
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // buat nama filenya 
    const ext = path.extname(req.file.originalname);
    const timestamp = Date.now();
    const filename = `question-${timestamp}${ext}`;
    
    // buat path lengkap untuk file
    const filepath = path.join(userDir, filename);
    
    // simpan file ke disk dari memory
    fs.writeFileSync(filepath, req.file.buffer);
    
    // update req.file dengan path dan nama file yang baru
    req.file.path = filepath;
    req.file.filename = filename;
    
    next();
  } catch (error) {
    return res.status(500).json({ message: "Error saving file", error: error.message });
  }
};

// middleware untuk update gambar pertanyaan (mengganti gambar lama dengan yang baru)
const replaceQuestionImage = () => async (req, res, next) => {
  if (!req.file) {
    return next(); // Tidak ada file baru yang diupload, lanjutkan
  }
  
  try {
    const userId = req.user?.id || "anonymous";
    const questionId = req.body.question_id;
    
    if (!questionId) {
      return res.status(400).json({ 
        message: "ID pertanyaan diperlukan untuk mengupdate gambar" 
      });
    }
    
    // Cari gambar yang sudah ada untuk pertanyaan ini
    const existingImage = await QuestionImage.findOne({
      where: {
        question_id: questionId,
        user_id: userId
      }
    });
    
    // Buat direktori untuk menyimpan gambar baru
    const userDir = path.join(__dirname, "../uploads", userId.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Buat nama file baru
    const ext = path.extname(req.file.originalname);
    const timestamp = Date.now();
    const filename = `question-${timestamp}${ext}`;
    const filepath = path.join(userDir, filename);
    
    // Simpan file baru ke disk
    fs.writeFileSync(filepath, req.file.buffer);
    
    // Update req.file dengan path dan nama file yang baru
    req.file.path = filepath;
    req.file.filename = filename;
    
    // Jika ada gambar lama, hapus file fisiknya
    if (existingImage && existingImage.image_url) {
      try {
        const oldFilePath = existingImage.image_url; // ambil path gambar lama dari database
        let absolutePath;
        
        if (oldFilePath.startsWith('/uploads/')) {
          // Jika path dimulai dengan /uploads/
          const relativePath = oldFilePath.substring('/uploads/'.length); // Hapus /uploads/ di awal
          absolutePath = path.join(__dirname, "../uploads", relativePath);
        } else if (oldFilePath.startsWith('/')) {
          // Jika path dimulai dengan / tapi bukan /uploads/
          const relativePath = oldFilePath.substring(1); // Hapus / di awal
          absolutePath = path.join(__dirname, "../uploads", relativePath);
        } else {
          // Jika sudah absolute path
          absolutePath = oldFilePath;
        }
        
        console.log("Mencoba menghapus file:", absolutePath);
        
        // Cek apakah file ada, jika ada hapus
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
          console.log("File berhasil dihapus");
        } else {
          console.log("File tidak ditemukan");
          
          // Coba alternatif path jika file tidak ditemukan
          const altPath = path.join(__dirname, "..", oldFilePath);
          console.log("Mencoba path alternatif:", altPath);
          if (fs.existsSync(altPath)) {
            fs.unlinkSync(altPath);
            console.log("File berhasil dihapus di lokasi alternatif");
          } else {
            console.log("File tidak ditemukan di lokasi alternatif");
          }
        }
      } catch (err) {
        console.error('Gagal menghapus file lama:', err);
        // Lanjutkan proses meskipun gagal menghapus file lama
      }
    }
    
    // Tambahkan info gambar lama ke req untuk digunakan di controller
    req.oldImage = existingImage;
    
    next();
  } catch (error) {
    return res.status(500).json({ 
      message: "Error saat mengganti gambar", 
      error: error.message 
    });
  }
};

module.exports = { upload, parseForm, saveFile, replaceQuestionImage };