const express=require('express');
const chatController=require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddlware');
const multerMiddleware = require('../config/cloudinaryConfig');

const router=express.Router();


router.post('/send-message',authMiddleware,chatController.sendMessage)
router.delete('/delete-message/:messageId',authMiddleware,chatController.deleteMessage)
router.get('/conversations/:conversationId/messages',authMiddleware,chatController.getMessages)
router.get('/conversations',authMiddleware,chatController.getConversations) 
router.put('/message/read',authMiddleware,chatController.markMessageAsRead)

module.exports=router;
