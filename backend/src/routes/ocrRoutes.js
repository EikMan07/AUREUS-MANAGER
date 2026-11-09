import { Router } from 'express';
import multer from 'multer';
import { scanCedula } from '../controllers/ocrController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// Imagen en memoria (sin tocar disco), máx. 12 MB, solo imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'imagen'));
  }
});

function handleUpload(req, res, next) {
  upload.single('imagen')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen supera el tamaño máximo de 12 MB.'
        : 'El archivo enviado no es una imagen válida.';
      return res.status(400).json({ error: message });
    }
    return next(err);
  });
}

router.post('/cedula', handleUpload, scanCedula);

export default router;
