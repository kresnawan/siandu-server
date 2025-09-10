// ./middleware/multerConfig.js

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save to 'uploads/' folder
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp + random number + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `kader-${uniqueSuffix}${ext}`);
  }
});

// File filter — only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create and export the multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Export single file upload for 'photo' field
export const uploadPhoto = upload.single('photo');

// You can also export other configurations if needed, e.g.:
// export const uploadMultiple = upload.array('photos', 5);
// export const uploadFields = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'gallery', maxCount: 5 }]);

export default upload;