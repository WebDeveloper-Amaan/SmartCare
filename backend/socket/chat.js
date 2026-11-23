/**
 * Socket.io Chat Handlers
 * - Private one-to-one messaging
 * - Geo-room based live location (only nearby users receive updates)
 * - Cluster-safe: each worker tracks its own sockets; messages route via userId rooms
 */

const Message = require('../models/Message')
const User = require('../models/User')
const Booking = require('../models/Booking')
const jwt = require('jsonwebtoken')
const sendEmail = require('../utils/sendEmail')

// Send in-app message + optional email notification
async function sendSessionNotification(io, { fromId, fromName, toId, text, emailSubject, emailHtml }) {
  try {
    const receiver = await User.findById(toId).select('name email')
    if (!receiver) return
    const conversationId = [fromId, toId].sort().join('_')
    const saved = await Message.create({
      sender: fromId, senderName: fromName,
      receiver: toId, receiverName: receiver.name,
      conversationId, text, messageType: 'text'
    })
    io.to(toId).emit('receive_message', {
      _id: saved._id, from: fromId, to: toId,
      text: saved.text, senderName: fromName, createdAt: saved.createdAt
    })
    // Email — best effort, never throws
    if (emailSubject && emailHtml && receiver.email) {
      sendEmail({ to: receiver.email, subject: emailSubject, html: emailHtml }).catch(() => {})
    }
  } catch (e) {
    console.error('sendSessionNotification error:', e.message)
  }
}

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

    // ── Session GPS tracking (babysitter → parent only) ────────────
    // Babysitter emits this during an active booking session
    socket.on('session:location', ({ bookingId, parentId, lat, lng, accuracy }) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') return
      // Only forward to the specific parent — not broadcast to all nearby
      io.to(parentId).emit('session:location', {
        bookingId, sitterId: userId, sitterName: socket.user.name, lat, lng, accuracy,
        timestamp: Date.now()
      })
    })

    // Babysitter arrived at parent's home — session GPS starts
    socket.on('session:start', async ({ bookingId, parentId, lat, lng }) => {
      console.log(`📍 Session GPS started: ${socket.user.name} → booking ${bookingId}`)
      const sitterName = socket.user.name
      io.to(parentId).emit('session:started', {
        bookingId, sitterId: userId, sitterName, lat, lng, timestamp: Date.now()
      })
      const text = `📍 ${sitterName} has arrived and started the session! Live GPS tracking is now active.`
      await sendSessionNotification(io, {
        fromId: userId, fromName: sitterName, toId: parentId, text,
        emailSubject: `📍 ${sitterName} has arrived for your booking`,
        emailHtml: `<p>Hi,</p><p><strong>${sitterName}</strong> has arrived at your home and started the babysitting session.</p><p>Live GPS tracking is now active in your SmartCare dashboard.</p><p>— SmartCare</p>`
      })
    })

    // Session ended — stop GPS, notify parent
    socket.on('session:end', async ({ bookingId, parentId }) => {
      console.log(`🏁 Session GPS ended: ${socket.user.name} → booking ${bookingId}`)
      const sitterName = socket.user.name
      io.to(parentId).emit('session:ended', {
        bookingId, sitterId: userId, timestamp: Date.now()
      })
      const text = `🏁 ${sitterName} has ended the session and stopped GPS tracking. Your child is safe!`
      await sendSessionNotification(io, {
        fromId: userId, fromName: sitterName, toId: parentId, text,
        emailSubject: `🏁 Session ended by ${sitterName}`,
        emailHtml: `<p>Hi,</p><p><strong>${sitterName}</strong> has ended the babysitting session and stopped GPS tracking.</p><p>We hope everything went well! You can leave a review from your SmartCare dashboard.</p><p>— SmartCare</p>`
      })
    })

    // SOS panic button — highest priority alert
    socket.on('session:sos', async ({ bookingId, parentId, lat, lng, message }) => {
      console.log(`🚨 SOS from ${socket.user.name} on booking ${bookingId}`)
      const sitterName = socket.user.name
      const sosMsg = message || 'Emergency! Please call immediately.'
      io.to(parentId).emit('session:sos', {
        bookingId, sitterId: userId, sitterName, lat, lng,
        message: sosMsg, timestamp: Date.now()
      })
      const text = `🚨 SOS ALERT from ${sitterName}: "${sosMsg}" — Please call them immediately!`
      await sendSessionNotification(io, {
        fromId: userId, fromName: sitterName, toId: parentId, text,
        emailSubject: `🚨 URGENT: SOS Alert from ${sitterName}`,
        emailHtml: `<p style="color:red"><strong>🚨 EMERGENCY ALERT</strong></p><p><strong>${sitterName}</strong> has triggered an SOS alert during your booking.</p><p><strong>Message:</strong> ${sosMsg}</p><p>Please call ${sitterName} immediately and check on your child.</p><p>— SmartCare</p>`
      })
    })

    // ── WebRTC video stream signaling ───────────────────────────
    // Both sides join the room on mount — no peer creation yet
    socket.on('stream:join', ({ roomId }) => {
      socket.join(roomId)
    })

    // Parent is ready to receive — re-join room defensively, relay to babysitter
    socket.on('stream:watch_ready', ({ roomId }) => {
      socket.join(roomId)
      socket.to(roomId).emit('stream:watch_ready')
    })

    // Relay WebRTC offer/answer/ICE signals between peers
    socket.on('stream:signal', ({ roomId, signal }) => {
      socket.to(roomId).emit('stream:signal', { signal })
    })

    // Babysitter ended stream — notify parent, but stay in room for re-streams
    socket.on('stream:end', ({ roomId }) => {
      socket.to(roomId).emit('stream:ended')
      // Do NOT leave the room — babysitter must stay to receive watch_ready on re-stream
    })

    // Re-join room on stream:ready in case socket lost room membership
    socket.on('stream:ready', ({ roomId }) => {
      socket.join(roomId)
      socket.to(roomId).emit('stream:ready')
    })

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
