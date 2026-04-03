const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const upload = require('../middleware/upload');

// Protected: get all lessons with user progress
router.get('/my-progress', authMiddleware, lessonController.getMyLessonsProgress);

// Protected: all users must be logged in to browse curriculum
router.get('/', authMiddleware, lessonController.getAllLessons);

// Protected: only admins may create, update, or delete lessons
const cpUpload = upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);

router.post('/upload', authMiddleware, isAdmin, cpUpload, lessonController.uploadLesson);
router.put('/:id', authMiddleware, isAdmin, cpUpload, lessonController.updateLesson);
router.delete('/:id', authMiddleware, isAdmin, lessonController.deleteLesson);

// Progress tracking
router.post('/:lessonId/progress', authMiddleware, lessonController.updateProgress);

module.exports = router;
