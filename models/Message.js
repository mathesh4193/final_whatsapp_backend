const mongoose = require('mongoose');
const { content } = require('../../frontend/tailwind.config');

const conversationSchema = new mongoose.Schema({
    conversation:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,},
    imageOrVideoUrl: {
        type: String,
        enum: ['image', 'video', 'text'],

    },
    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
       emoji: String,
    }],
    messageStatus: {
        type: String,
        default: 'sent',
    },
}, { timestamps: true });

const Message = mongoose.model('Message', conversationSchema);
module.exports = Message;