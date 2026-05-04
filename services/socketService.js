const { Server } = require('socket.io');
const User = require('../models/User');
const Message = require('../models/Message');

const onlineUsers = new Map();
const typingUsers = new Map();

const socketService = (server) => {
    const io = new Server(server, {
        cors: {
            origin: [
                process.env.CLIENT_URL,
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002",
            ],
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            credentials: true,
        },
        pingTimeout: 6000,
    });

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);
        let userId;

        //  USER CONNECT
        socket.on("user-connected", async (connectingUserid) => {
            try {
                userId = connectingUserid;

                onlineUsers.set(userId, socket.id);
                socket.join(userId);

                await User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    lastSeen: new Date()
                });

                io.emit("user_status", { userId, isOnline: true });

            } catch (error) {
                console.error("Error in user-connected:", error);
            }
        });

        //  GET USER STATUS
        socket.on("get_user_status", (requestedUserId, callback) => {
            const isOnline = onlineUsers.has(requestedUserId);
            callback({
                userId: requestedUserId,
                isOnline,
                lastSeen: isOnline ? null : new Date()
            });
        });

        //  SEND MESSAGE
        socket.on("send_message", async (message) => {
            try {
                const receiverSocketId = onlineUsers.get(message.receiver?._id);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receive_message", message);
                }
            } catch (error) {
                console.error("Error sending message:", error);
            }
        });

        //  MESSAGE READ
        socket.on("message_read", async ({ messageIds, senderId }) => {
            try {
                await Message.updateMany(
                    { _id: { $in: messageIds } },
                    { $set: { messageStatus: "read" } }
                );

                const senderSocketId = onlineUsers.get(senderId);
                if (senderSocketId) {
                    messageIds.forEach((messageId) => {
                        io.to(senderSocketId).emit("messages_status_updated", {
                            messageId,
                            messageStatus: "read"
                        });
                    });
                }
            } catch (error) {
                console.error("Error marking messages as read:", error);
            }
        });

        //  TYPING START
        socket.on("typing_start", ({ conversationId, receiverId }) => {
            if (!userId || !conversationId || !receiverId) return;

            socket.to(receiverId).emit("user_typing", {
                userId,
                conversationId,
                isTyping: true
            });
        });

        // TYPING STOP
        socket.on("typing_stop", ({ conversationId, receiverId }) => {
            if (!userId || !conversationId || !receiverId) return;

            socket.to(receiverId).emit("user_typing", {
                userId,
                conversationId,
                isTyping: false
            });
        });

        //  ADD REACTION (FIXED LOCATION + LOGIC)
        socket.on('add_reaction', async ({ messageId, emoji, reactionUserId }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;

                const existingIndex = message.reactions.findIndex(
                    (r) => r.user.toString() === reactionUserId
                );

                if (existingIndex > -1) {
                    if (message.reactions[existingIndex].emoji === emoji) {
                        message.reactions.splice(existingIndex, 1);
                    } else {
                        message.reactions[existingIndex].emoji = emoji;
                    }
                } else {
                    message.reactions.push({ user: reactionUserId, emoji });
                }

                await message.save();

                const populatedMessage = await Message.findById(messageId)
                    .populate("sender", "username profilePicture")
                    .populate("receiver", "username profilePicture")
                    .populate("reactions.user", "username profilePicture");

                const reactionUpdated = {
                    messageId,
                    reactions: populatedMessage.reactions
                };

                const senderSocket = onlineUsers.get(populatedMessage.sender?._id.toString());
                const receiverSocket = onlineUsers.get(populatedMessage.receiver?._id.toString());

                if (senderSocket) {
                    io.to(senderSocket).emit("reaction_updated", reactionUpdated);
                }

                if (receiverSocket) {
                    io.to(receiverSocket).emit("reaction_updated", reactionUpdated);
                }

            } catch (error) {
                console.error("Error adding reaction:", error);
            }
        });

        //  DISCONNECT
       const handleDisconnect = async () => {
            if(!userId) return;
            try{
                onlineUsers.delete(userId);

                if(typingUsers.has(userId)){
                    const userTyping = typingUsers.get(userId);
                    Object.keys(userTyping).forEach((keys) => {
                        if(keys.endsWith('_timeout')){
                            clearTimeout(userTyping[keys]);
                        }
                    });
                    typingUsers.delete(userId);
                }
                await User.findByIdAndUpdate(userId, {
                    isOnline: false,
                    lastSeen: new Date()
                });
                io.emit("user_status", { userId, isOnline: false, lastSeen: new Date() });

                console.log(`user ${userId} disconnected`);
            }catch(error){
                console.error("Error disconnecting user:", error);
            }
        }

        socket.on('disconnect', handleDisconnect);
    });
    io.socketUserMap = onlineUsers;
    return io;
};

module.exports = socketService;