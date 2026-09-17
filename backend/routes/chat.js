/**
 * Chat Routes
 * Handles messaging between parents and babysitters
 */
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
// ============================================
// @route   GET /api/chat/conversations
// @desc    Get all conversations for current user
// @access  Private
// ============================================
// ============================================
// @route   GET /api/chat/unread/count
// @desc    Get unread message count
// @access  Private
// ============================================
router.get('/unread/count', protect, async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user.id,
            status: { $ne: 'read' },
            deletedByReceiver: false
        });
        res.json({ success: true, unreadCount: count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});
// ============================================
// @route   GET /api/chat/conversations
// @desc    Get all conversations for current user
// @access  Private
// ============================================
router.get('/conversations', protect, async (req, res) => {
    try {
        const conversations = await Message.getUserConversations(req.user.id);
        // Populate user details for each conversation
        const populatedConversations = await Promise.all(
            conversations.map(async (conv) => {
                const otherUserId = conv.lastMessage.sender.toString() === req.user.id
                    ? conv.lastMessage.receiver
                    : conv.lastMessage.sender;
                const otherUser = await User.findById(otherUserId)
                    .select('name photo role isActive');
                return {
                    conversationId: conv._id,
                    lastMessage: {
                        text: conv.lastMessage.text,
                        messageType: conv.lastMessage.messageType,
                        createdAt: conv.lastMessage.createdAt,
                        isFromMe: conv.lastMessage.sender.toString() === req.user.id
                    },
                    unreadCount: conv.unreadCount,
                    user: otherUser
                };
            })
        );
        res.json({
            success: true,
            conversations: populatedConversations
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});
// ============================================
// @route   GET /api/chat/:userId
// @desc    Get messages with specific user
// @access  Private
// ============================================
router.get('/:userId', protect, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;
        // Get messages
        const messages = await Message.getConversation(
            req.user.id,
            req.params.userId,
            parseInt(limit),
            skip
        );
        // Mark messages as read
        const conversationId = Message.getConversationId(req.user.id, req.params.userId);
        await Message.markAsRead(conversationId, req.user.id);
        // Get other user details
        const otherUser = await User.findById(req.params.userId)
            .select('name photo role isActive');
        res.json({
            success: true,
            user: otherUser,
            messages: messages.reverse(), // Return in chronological order
            hasMore: messages.length === parseInt(limit)
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
// ============================================
// @route   POST /api/chat/send
// @desc    Send a message
// @access  Private
// ============================================
router.post('/send', protect, async (req, res) => {
    try {
        const { receiverId, text, messageType = 'text', mediaUrl, location, bookingId } = req.body;
        // Validate receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ error: 'Recipient not found' });
        }
        // Create conversation ID
        const conversationId = Message.getConversationId(req.user.id, receiverId);
        // Create message
        const message = await Message.create({
            sender: req.user.id,
            senderName: req.user.name,
            receiver: receiverId,
            receiverName: receiver.name,
            conversationId,
            messageType,
            text,
            mediaUrl,
            location,
            booking: bookingId
        });
        // Populate reply if exists
        await message.populate('replyTo', 'text messageType');
        res.status(201).json({
            success: true,
            message
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
// ============================================
// @route   PUT /api/chat/read/:conversationId
// @desc    Mark messages as read
// @access  Private
// ============================================
router.put('/read/:conversationId', protect, async (req, res) => {
    try {
        await Message.markAsRead(req.params.conversationId, req.user.id);
        res.json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});
// ============================================
// @route   DELETE /api/chat/message/:id
// @desc    Delete a message (soft delete)
// @access  Private
// ============================================
router.delete('/message/:id', protect, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        // Check if user is sender or receiver
        if (message.sender.toString() === req.user.id) {
            message.deletedBySender = true;
        } else if (message.receiver.toString() === req.user.id) {
            message.deletedByReceiver = true;
        } else {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await message.save();
        // Permanently delete if both sides have deleted (saves DB space)
        if (message.deletedBySender && message.deletedByReceiver) {
            await Message.findByIdAndDelete(req.params.id);
        }
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete message' });
    }
});
// ============================================
// @route   DELETE /api/chat/conversation/:userId
// @desc    Delete entire conversation
// @access  Private
// ============================================
router.delete('/conversation/:userId', protect, async (req, res) => {
    try {
        const conversationId = Message.getConversationId(req.user.id, req.params.userId);
        // Soft delete for this user
        await Message.updateMany(
            { conversationId, sender: req.user.id },
            { deletedBySender: true }
        );
        await Message.updateMany(
            { conversationId, receiver: req.user.id },
            { deletedByReceiver: true }
        );
        // Permanently remove messages both sides have deleted
        await Message.deleteMany({ conversationId, deletedBySender: true, deletedByReceiver: true });
        res.json({ success: true, message: 'Conversation deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});
module.exports = router;
