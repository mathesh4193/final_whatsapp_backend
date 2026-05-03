const response = require("../utils/responseHandler");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageStatus } = req.body;
    const senderId = req.user.id;
    const file = req.file;

    if (!receiverId) {
      return response({
        res,
        statusCode: 400,
        message: "Receiver ID is required",
      });
    }

    const participants = [senderId, receiverId].sort();

    let conversation = await Conversation.findOne({
      participants: { $all: participants },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants,
      });
      await conversation.save();
    }
    let imageOrVideoUrl = null;
    let contentType = "text";

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);

      if (!uploadFile?.secure_url) {
        return response({
          res,
          statusCode: 400,
          message: "Failed to upload file to Cloudinary",
        });
      }
      imageOrVideoUrl = uploadFile?.secure_url;

      if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        return response({ res, statusCode: 400, message: "Invalid file type" });
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response({
        res,
        statusCode: 400,
        message: "Content or file is required",
      });
    }
    const message = new Message({
      conversation: conversation?._id,
      sender: senderId,
      receiver: receiverId,
      content,
      imageOrVideoUrl,
      contentType,
      messageStatus: messageStatus === 'send' ? 'sent' : (messageStatus || 'sent'),
    });
    await message.save();

    if (message?.content || message?.imageOrVideoUrl) {
      conversation.lastMessage = message?._id;
    }
    conversation.unreadcount = (conversation.unreadcount || 0) + 1;
    await conversation.save();

    const populatedMessage = await Message.findById(message?._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");

      if(req.io && req.socketUserMap) {
            const receiverSocketId = req.socketUserMap.get(receiverId);
            if(receiverSocketId) {
                req.io.to(receiverSocketId).emit("receiveMessage", { message: populatedMessage });
                message.messageStatus = "delivered";
                await message.save();
            }
        }

    return response({
      res,
      statusCode: 200,
      message: "Message sent successfully",
      data: { message: populatedMessage },
    });
  } catch (error) {
    console.error(error);
    return response({ res, statusCode: 500, message: "Internal server error" });
  }
};


exports.getConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const conversations = await Conversation.find({
      participants: userId
    }).populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture"
        }
      }).sort({ updatedAt: -1 }).lean();

    return response({ res, statusCode: 200, message: 'Conversations retrieved successfully', data: { conversations } });
  } catch (error) {
    console.error(error);
    return response({ res, statusCode: 500, message: 'Internal server error' });
  }
};

exports.getMessages = async (req, res) => {
  const conversationId = req.params.conversationId;
  const userId = req.user.id;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response({ res, statusCode: 404, message: 'Conversation not found' });
    }
    if (!conversation.participants.includes(userId)) {
      return response({ res, statusCode: 403, message: 'You are not part of this conversation' });
    }
    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messageStatus: { $in: ["sent", "delivered"] }
      },
      {
        messageStatus: "delivered"
      }
    )

    conversation.unreadcount = 0;
    await conversation.save();

    return response({ res, statusCode: 200, message: 'Messages retrieved successfully', data: { messages } });

  } catch (error) {
    console.error(error);
    return response({ res, statusCode: 500, message: 'Internal server error' });
  }
}

exports.markMessageAsRead = async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.user.id;
  try {
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiver: userId,
      },
      {
        messageStatus: "read"
      }
    )
     if(req.io && req.socketUserMap) {
      for(const message of messages) {
        const senderSocketId = req.socketUserMap.get(message.sender.toString());
        if(senderSocketId) {
          const updatedMessage = {
            _id: message._id,
            messageStatus: "read"
          }
          req.io.to(senderSocketId).emit("messageRead", { message: updatedMessage });
          await Message.save();
        }
      }
    }


    return response({ res, statusCode: 200, message: 'Messages marked as read successfully' });

  }
  catch (error) {
    console.error(error);
    return response({ res, statusCode: 500, message: 'Internal server error' });
  }
}

exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response({ res, statusCode: 404, message: 'Message not found' });
    }
    if (message.sender.toString() !== userId) {
      return response({ res, statusCode: 403, message: 'You are not the sender of this message' });
    }
    await Message.deleteOne();
    if(req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(message.receiver.toString());
      if(receiverSocketId) {
        req.io.to(receiverSocketId).emit("messageDeleted", { messageId });
      }
      
    }

    return response({ res, statusCode: 200, message: 'Message deleted successfully' });
  }
  catch (error) {
    console.error(error);
    return response({ res, statusCode: 500, message: 'Internal server error' });
  }
}

