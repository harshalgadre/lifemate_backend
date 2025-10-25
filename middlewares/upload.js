const multer = require('multer');

// Memory storage so we can stream to Cloudinary
const storage = multer.memoryStorage();

// Basic file filters
const imageFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files are allowed'));
};

const documentFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only documents (pdf, doc, docx, txt) are allowed'));
};

const limits = { fileSize: 10 * 1024 * 1024 }; // 10 MB

module.exports = {
  uploadImage: multer({ storage, fileFilter: imageFilter, limits }),
  uploadDocument: multer({ storage, fileFilter: documentFilter, limits }),
  uploadAny: multer({ storage, limits })
};
