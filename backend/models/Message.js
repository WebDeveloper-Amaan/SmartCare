/**
 * Message Model
 * Handles chat messages between users
 */
const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
    // Conversation participants
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverName: {
        type: String,
        required: true
    },
    // Conversation ID (sorted combination of user IDs)
    conversationId: {
        type: String,
        required: true,
        index: true
    },
    // Message content
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'audio', 'video', 'location', 'booking'],
        default: 'text'
    },
    text: {
        type: String,
        maxlength: 2000
    },
    mediaUrl: {
        type: String
    },
    mediaMetadata: {
        fileName: String,
        fileSize: Number,
        mimeType: String,
        duration: Number // for audio/video
    },
    // Booking reference (if sharing booking info)
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    // Location sharing
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    // Status
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    deliveredAt: Date,
    readAt: Date,
    // Deletion
    deletedBySender: {
        type: Boolean,
        default: false
    },
    deletedByReceiver: {
        type: Boolean,
        default: false
    },
    // Reply to another message
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }
}, {
    timestamps: true
});
// Indexes for efficient querying
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, status: 1 });
// Static method to generate conversation ID
messageSchema.statics.getConversationId = function(userId1, userId2) {
    return [userId1.toString(), userId2.toString()].sort().join('_');
};
// Static method to get conversation
messageSchema.statics.getConversation = async function(userId1, userId2, limit = 50, skip = 0) {
    const conversationId = this.getConversationId(userId1, userId2);
    
    return await this.find({
        conversationId,
        $or: [
            { sender: userId1, deletedBySender: false },
            { receiver: userId1, deletedByReceiver: false }
        ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('replyTo', 'text messageType');
};
// Static method to get all conversations for a user
messageSchema.statics.getUserConversations = async function(userId) {
    const conversations = await this.aggregate([
        {
            $match: {
                $or: [
                    { sender: new mongoose.Types.ObjectId(userId), deletedBySender: false },
                    { receiver: new mongoose.Types.ObjectId(userId), deletedByReceiver: false }
                ]
            }
        },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: '$conversationId',
                lastMessage: { $first: '$$ROOT' },
                unreadCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$receiver', new mongoose.Types.ObjectId(userId)] },
                                    { $ne: ['$status', 'read'] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        { $sort: { 'lastMessage.createdAt': -1 } }
    ]);
    return conversations;
};
// Mark messages as read
messageSchema.statics.markAsRead = async function(conversationId, userId) {
    return await this.updateMany(
        {
            conversationId,
            receiver: userId,
            status: { $ne: 'read' }
        },
        {
            status: 'read',
            readAt: new Date()
        }
    );
};
module.exports = mongoose.model('Message', messageSchema);
