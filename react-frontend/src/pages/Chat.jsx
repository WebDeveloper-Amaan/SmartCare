import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/useAuth'
import api from '../services/api'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

const EMOJIS = [
  '😊','😂','❤️','👍','🙏','😍','🥰','😘','😁','🎉',
  '✨','🔥','💯','😢','😭','😅','🤔','👏','💪','🌟',
  '😎','🤗','💕','😴','🙈','🤣','😇','🥺','😤','💀',
  '👀','🫶','🤝','👋','🎊','🍼','👶','🏠','⭐','💬',
  '🌸','🦋','🌈','☀️','🌙','⚡','🎵','🎶','🍕','🎂'
]

function DateSeparator({ date }) {
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  let label
  if (diffDays === 0) label = 'Today'
  else if (diffDays === 1) label = 'Yesterday'
  else if (diffDays < 7) label = d.toLocaleDateString('en-IN', { weekday: 'long' })
  else label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-100"></div>
      <span className="text-xs text-gray-400 font-medium px-2 bg-white rounded-full border border-gray-100 py-0.5">{label}</span>
      <div className="flex-1 h-px bg-gray-100"></div>
    </div>
  )
}

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

export default function Chat() {
  const { userId } = useParams()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [recipient, setRecipient] = useState(null)
  const [isOnline, setIsOnline] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEmoji, setShowEmoji] = useState(false)
  const [deletingMsg, setDeletingMsg] = useState(null)
  const [showDeleteConv, setShowDeleteConv] = useState(false)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimer = useRef(null)
  const emojiRef = useRef(null)
  const myId = user?._id || user?.id

  useEffect(() => {
    if (!user || !userId) return

    api.get(`/babysitters/${userId}`)
      .then(r => setRecipient(r.data.babysitter))
      .catch(() => api.get(`/auth/user/${userId}`).then(r => setRecipient(r.data.user)).catch(() => {}))

    api.get(`/chat/${userId}`)
      .then(r => { setMessages(r.data.messages || []); setLoading(false) })
      .catch(() => setLoading(false))

    const token = localStorage.getItem('token')
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('online_users', ({ userIds }) => setIsOnline(userIds.includes(userId)))
    socket.on('receive_message', msg => {
      if (msg.from === userId || msg.to === userId) setMessages(prev => [...prev, msg])
    })
    socket.on('message_sent', msg => {
      setMessages(prev => prev.map(m => m._optimistic && m.text === msg.text ? msg : m))
    })
    socket.on('user_online', ({ userId: uid }) => { if (uid === userId) setIsOnline(true) })
    socket.on('user_offline', ({ userId: uid }) => { if (uid === userId) setIsOnline(false) })
    socket.on('typing', ({ from }) => { if (from === userId) setIsTyping(true) })
    socket.on('stop_typing', ({ from }) => { if (from === userId) setIsTyping(false) })

    return () => socket.disconnect()
  }, [userId, myId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Close emoji on outside click
  useEffect(() => {
    const handler = e => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const deleteMessage = async (msgId) => {
    try {
      await api.delete(`/chat/message/${msgId}`)
      setMessages(prev => prev.filter(m => m._id !== msgId))
      toast.success('Message deleted')
    } catch { toast.error('Could not delete') }
    finally { setDeletingMsg(null) }
  }

  const deleteConversation = async () => {
    try {
      await api.delete(`/chat/conversation/${userId}`)
      setMessages([])
      setShowDeleteConv(false)
      toast.success('Conversation cleared')
    } catch { toast.error('Could not delete conversation') }
  }

  const handleTyping = useCallback(e => {
    setText(e.target.value)
    socketRef.current?.emit('typing', { to: userId })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => socketRef.current?.emit('stop_typing', { to: userId }), 1000)
  }, [userId])

  const sendMessage = e => {
    e.preventDefault()
    if (!text.trim()) return
    setMessages(prev => [...prev, { _optimistic: true, from: myId, to: userId, text: text.trim(), createdAt: new Date() }])
    socketRef.current?.emit('send_message', { from: myId, to: userId, text: text.trim(), senderName: user?.name, room: [myId, userId].sort().join('_') })
    socketRef.current?.emit('stop_typing', { to: userId })
    setText('')
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const formatTime = date => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'linear-gradient(to right, rgba(110,193,228,0.08) 0%, rgba(255,255,255,1) 50%, rgba(249,202,218,0.10) 100%)' }}>
      <Navbar />

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-3 pt-20 pb-3 min-h-0">

        {/* ── Header ── */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-3 flex items-center gap-3 border border-gray-100 flex-shrink-0">
          <Link to="/chat" className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-[#6EC1E4] transition rounded-xl hover:bg-gray-50 flex-shrink-0">
            <i className="fas fa-arrow-left"></i>
          </Link>

          <Link to={`/profile/${userId}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src={recipient?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(recipient?.name || 'U')}&background=6EC1E4&color=fff&size=80`}
                alt={recipient?.name || 'User'}
                className="w-11 h-11 rounded-xl object-cover"
              />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`}></span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{recipient?.name || 'Loading...'}</p>
              <p className={`text-xs flex items-center gap-1 ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                {isTyping
                  ? <><span className="inline-flex gap-0.5">{[0,1,2].map(i => <span key={i} className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }}></span>)}</span> typing...</>
                  : <><span className={`w-1.5 h-1.5 rounded-full inline-block ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`}></span>{isOnline ? 'Online' : 'Offline'}</>
                }
              </p>
            </div>
          </Link>

          {/* View profile */}
          <Link
            to={`/profile/${userId}`}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-[#6EC1E4] transition rounded-xl hover:bg-gray-50 flex-shrink-0"
            title="View profile"
          >
            <i className="fas fa-user text-sm"></i>
          </Link>

          {/* Delete conversation */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowDeleteConv(v => !v)}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-400 transition rounded-xl hover:bg-red-50"
              title="Delete conversation"
            >
              <i className="fas fa-trash-alt text-sm"></i>
            </button>
            {showDeleteConv && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 z-30 whitespace-nowrap">
                <p className="text-xs text-gray-500 mb-2 font-medium">Delete entire conversation?</p>
                <div className="flex gap-2">
                  <button onClick={deleteConversation} className="flex-1 bg-red-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-red-600 transition">Delete</button>
                  <button onClick={() => setShowDeleteConv(false)} className="flex-1 bg-gray-100 text-gray-600 text-xs font-semibold py-1.5 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Messages area ── */}
        <div
          className="flex-1 overflow-y-auto rounded-2xl px-3 py-4 min-h-0"
          style={{ background: 'rgba(255,255,255,0.85)' }}
          onClick={() => { setDeletingMsg(null); setShowDeleteConv(false) }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6EC1E4]"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-20 h-20 gradient-bg rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <i className="fas fa-comments text-white text-3xl"></i>
              </div>
              <p className="font-bold text-gray-700 text-lg">Start the conversation</p>
              <p className="text-sm text-gray-400 mt-1 nunito">Say hello to {recipient?.name?.split(' ')[0] || 'them'} 👋</p>
              <button
                onClick={() => { setText('Hi! I found your profile and would love to discuss childcare. 😊'); inputRef.current?.focus() }}
                className="mt-4 text-xs text-[#6EC1E4] border border-[#6EC1E4]/30 px-4 py-2 rounded-xl hover:bg-[#6EC1E4]/5 transition"
              >
                👋 Send a greeting
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((m, i) => {
                const isMe = m.from === myId || m.sender?.toString() === myId || m.sender === myId
                const prevMsg = messages[i - 1]
                const nextMsg = messages[i + 1]
                const prevSender = prevMsg?.from || prevMsg?.sender?.toString()
                const currSender = m.from || m.sender?.toString()
                const nextSender = nextMsg?.from || nextMsg?.sender?.toString()
                const isFirst = !prevMsg || prevSender !== currSender || !isSameDay(prevMsg.createdAt, m.createdAt)
                const isLast = !nextMsg || nextSender !== currSender || !isSameDay(m.createdAt, nextMsg?.createdAt)
                const showDate = !prevMsg || !isSameDay(prevMsg.createdAt, m.createdAt)
                const showAvatar = !isMe && isLast

                return (
                  <div key={m._id || i}>
                    {showDate && <DateSeparator date={m.createdAt} />}

                    <div className={`flex items-end gap-2 group ${isMe ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-0.5'}`}>

                      {/* Other person avatar */}
                      {!isMe && (
                        <div className="w-7 flex-shrink-0 self-end mb-1">
                          {showAvatar ? (
                            <img
                              src={recipient?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(recipient?.name || 'U')}&background=6EC1E4&color=fff&size=40`}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : null}
                        </div>
                      )}

                      {/* Delete btn for my messages */}
                      {isMe && m._id && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeletingMsg(deletingMsg === m._id ? null : m._id) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-400 flex items-center justify-center flex-shrink-0 self-center"
                        >
                          <i className="fas fa-trash text-xs" style={{ fontSize: '9px' }}></i>
                        </button>
                      )}

                      {/* Bubble */}
                      <div className="relative max-w-xs lg:max-w-md">
                        <div className={`px-3.5 py-2.5 text-sm shadow-sm
                          ${isMe
                            ? `gradient-bg text-white ${m._optimistic ? 'opacity-60' : ''}
                               ${isFirst && isLast ? 'rounded-2xl' : isFirst ? 'rounded-2xl rounded-br-md' : isLast ? 'rounded-2xl rounded-tr-md' : 'rounded-xl rounded-r-md'}`
                            : `bg-white border border-gray-100 text-gray-800
                               ${isFirst && isLast ? 'rounded-2xl' : isFirst ? 'rounded-2xl rounded-bl-md' : isLast ? 'rounded-2xl rounded-tl-md' : 'rounded-xl rounded-l-md'}`
                          }`}
                        >
                          <p className="leading-relaxed break-words">{m.text || m.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-xs ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                              {formatTime(m.createdAt)}
                            </span>
                            {isMe && !m._optimistic && (
                              <i className="fas fa-check-double text-white/60" style={{ fontSize: '10px' }}></i>
                            )}
                            {isMe && m._optimistic && (
                              <i className="fas fa-clock text-white/40" style={{ fontSize: '9px' }}></i>
                            )}
                          </div>
                        </div>

                        {/* Delete confirm popover */}
                        {deletingMsg === m._id && (
                          <div
                            className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 px-3 py-2.5 flex items-center gap-2 whitespace-nowrap z-20"
                            onClick={e => e.stopPropagation()}
                          >
                            <i className="fas fa-trash-alt text-red-400 text-xs"></i>
                            <span className="text-xs text-gray-500">Delete message?</span>
                            <button onClick={() => deleteMessage(m._id)} className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-red-600 transition">Delete</button>
                            <button onClick={() => setDeletingMsg(null)} className="text-xs text-gray-400 hover:text-gray-600 transition">Cancel</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-end gap-2 justify-start mt-2">
                  <img
                    src={recipient?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(recipient?.name || 'U')}&background=6EC1E4&color=fff&size=40`}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                    <div className="flex gap-1 items-center">
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }}></span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div ref={emojiRef} className="relative mt-3 flex-shrink-0">
          {/* Emoji picker */}
          {showEmoji && (
            <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-30" style={{ width: '300px' }}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-gray-500">Emoji</span>
                <button onClick={() => setShowEmoji(false)} className="text-gray-300 hover:text-gray-500 transition">
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
              <div className="grid grid-cols-10 gap-0.5">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { setText(t => t + e); inputRef.current?.focus() }}
                    className="text-lg hover:bg-gray-100 rounded-lg p-1 transition leading-none aspect-square flex items-center justify-center"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={sendMessage} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex gap-2 items-end">
            {/* Emoji toggle */}
            <button
              type="button"
              onClick={() => setShowEmoji(v => !v)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition flex-shrink-0 ${showEmoji ? 'bg-[#6EC1E4]/15' : 'hover:bg-gray-100'}`}
            >
              😊
            </button>

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={text}
              onChange={handleTyping}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent resize-none py-2.5 max-h-28 leading-relaxed"
              style={{ minHeight: '40px' }}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!text.trim()}
              className="gradient-bg text-white w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-90 transition disabled:opacity-40 flex-shrink-0 shadow-sm"
            >
              <i className="fas fa-paper-plane text-sm"></i>
            </button>
          </form>

          <p className="text-center text-xs text-gray-300 mt-1.5">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}
