import multer from 'multer';
import path from 'path';

/**
 * Configuración de multer para upload de archivos
 * Por ahora guarda en memoria (luego implementaremos S3)
 */
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceptar imágenes y videos
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes y videos'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo (para videos)
  },
});

/**
 * Middleware para upload de avatar
 */
export const uploadAvatar = upload.single('avatar');

/**
 * Middleware para upload de banner
 */
export const uploadBanner = upload.single('banner');

/**
 * Middleware para upload de múltiples archivos (posts, stories)
 */
export const uploadFiles = upload.array('files', 10); // Máximo 10 archivos
