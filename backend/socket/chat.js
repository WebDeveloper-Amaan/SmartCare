/**
 * Socket.io Chat Handlers
 * - Private one-to-one messaging
 * - Geo-room based live location (only nearby users receive updates)
 * - Cluster-safe: each worker tracks its own sockets; messages route via userId rooms
 */

const Message = require('../models/Message')
const User = require('../models/User')
const jwt = require('jsonwebtoken')

// Returns a geo-room name for a lat/lng
// Rounds to 1 decimal degree (~11km grid cell) so nearby users share a room
function geoRoom(lat, lng) {
  return `geo_${(Math.round(lat * 10) / 10).toFixed(1)}_${(Math.round(lng * 10) / 10).toFixed(1)}`
}

// Returns the 9 surrounding geo-room names (current cell + 8 neighbours)
// This ensures users near a cell boundary still see each other
function nearbyRooms(lat, lng) {
  const rooms = []
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      rooms.push(geoRoom(
        Math.round((lat + dLat * 0.1) * 10) / 10,
        Math.round((lng + dLng * 0.1) * 10) / 10
      ))
    }
  }
  return rooms
}

module.exports = (io) => {
  // Authenticate every socket connection via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Authentication required'))
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('name role isBlocked')
      if (!user || user.isBlocked) return next(new Error('Unauthorized'))
      socket.user = user
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  // Track online users on THIS worker: userId -> socketId
  const onlineUsers = new Map()
  io.getOnlineUsers = () => onlineUsers

  // Track each user's current geo-room so we can leave it on move/disconnect
  const userGeoRoom = new Map()

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString()
    console.log(`🔌 ${socket.user.name} connected (${socket.id})`)

    // Join personal room — enables direct delivery by userId across all events
    socket.join(userId)
    onlineUsers.set(userId, socket.id)

    socket.emit('online_users', { userIds: Array.from(onlineUsers.keys()) })
    io.emit('user_online', { userId })

    // ── Private messaging ──────────────────────────────────────────
    socket.on('send_message', async ({ to, text }) => {
      try {
        if (!to || !text?.trim()) return

        const receiver = await User.findById(to).select('name')
        if (!receiver) return socket.emit('message_error', { error: 'Recipient not found' })

        const conversationId = [userId, to].sort().join('_')

        const saved = await Message.create({
          sender: userId,
          senderName: socket.user.name,
          receiver: to,
          receiverName: receiver.name,
          conversationId,
          text: text.trim(),
          messageType: 'text'
        })

        const messageData = {
          _id: saved._id,
          from: userId,
          to,
          text: saved.text,
          senderName: socket.user.name,
          createdAt: saved.createdAt
        }

        io.to(to).emit('receive_message', messageData)
        socket.emit('message_sent', messageData)

      } catch (error) {
        console.error('Send message error:', error)
        socket.emit('message_error', { error: 'Failed to send message' })
      }
    })

    // ── Typing indicators ──────────────────────────────────────────
    socket.on('typing', ({ to }) => io.to(to).emit('typing', { from: userId }))
    socket.on('stop_typing', ({ to }) => io.to(to).emit('stop_typing', { from: userId }))

    // ── Live location (geo-room scoped) ────────────────────────────
    socket.on('location_update', ({ lat, lng }) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') return

      const newRoom = geoRoom(lat, lng)
      const prevRoom = userGeoRoom.get(userId)

      // Leave old geo-room if user has moved to a different cell
      if (prevRoom && prevRoom !== newRoom) {
        socket.leave(prevRoom)
      }

      // Join new geo-room
      socket.join(newRoom)
      userGeoRoom.set(userId, newRoom)

      // Broadcast ONLY to the 9 surrounding cells (~33km radius max)
      // The sender themselves won't receive it (socket.to vs io.to)
      const rooms = nearbyRooms(lat, lng)
      rooms.forEach(room => {
        socket.to(room).emit('user_location', { userId, lat, lng })
      })
    })

    // ── Disconnect ─────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId)

      // Leave geo-room cleanly
      const room = userGeoRoom.get(userId)
      if (room) {
        socket.leave(room)
        userGeoRoom.delete(userId)
        // Tell nearby users this person's location is gone
        socket.to(room).emit('user_location_gone', { userId })
      }

      io.emit('user_offline', { userId })
      console.log(`👋 ${socket.user.name} disconnected`)
    })
  })
}
