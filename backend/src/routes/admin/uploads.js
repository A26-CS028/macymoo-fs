const express = require('express');
const multer = require('multer');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');
const { uploadPurpose } = require('../../validators/menu');
const { uploadImage } = require('../../services/blob');

const router = express.Router();

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB (batas body fungsi Vercel 4,5 MB)

// Memori, bukan disk: Vercel tidak punya disk tulis tetap, dan file langsung diteruskan ke Blob.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });

// Ubah error multer ke format error kontrak.
function receiveFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(httpError(400, 'FILE_TOO_LARGE', 'Ukuran file maksimal 2 MB'));
    }
    if (err instanceof multer.MulterError) {
      return next(httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', [{ field: 'file', message: 'File tidak valid' }]));
    }
    next(err);
  });
}

// requireAdmin paling depan: permintaan tanpa login ditolak sebelum body dibaca.
router.post('/', requireAdmin, receiveFile, validate(uploadPurpose), async (req, res, next) => {
  try {
    if (!req.file) {
      throw httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', [{ field: 'file', message: 'File wajib diisi' }]);
    }
    const url = await uploadImage(req.file.buffer, req.body.purpose);
    res.status(201).json({ url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;