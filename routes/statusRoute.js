const express = require('express');
const statusController = require('../controllers/statusController');
const authMiddleware = require('../middleware/authMiddlware');
const { multerMiddleware } = require('../config/cloudinaryConfig');

const router = express.Router();

router.post('/create', authMiddleware, multerMiddleware, statusController.createStatus);
router.get('/all', authMiddleware, statusController.getStatuses);
router.put('/:statusId/view', authMiddleware, statusController.viewStatus);
router.delete('/:statusId/delete', authMiddleware, statusController.deleteStatus);

module.exports = router;
