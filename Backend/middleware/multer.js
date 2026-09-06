import multer from "multer";

// Use in-memory storage so files can be streamed directly to Cloudinary
const storage = multer.memoryStorage();

// Only allow image uploads with sensible limits
const fileFilter = (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files (JPEG, PNG, WebP) are allowed"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1, // Single file per request
    },
});

export default upload;
