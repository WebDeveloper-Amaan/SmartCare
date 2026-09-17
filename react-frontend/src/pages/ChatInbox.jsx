import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/useAuth'
import api from '../services/api'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export default function ChatInbox() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [search, setSearch] = useState('')
  const [deletingConv, setDeletingConv] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    api.get('/chat/conversations')
      .then(r => setConversations(r.data.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false))

    const token = localStorage.getItem('token')
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('online_users', ({ userIds }) => setOnlineUsers(new Set(userIds)))
    socket.on('user_online', ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId])))
    socket.on('user_offline', ({ userId }) => setOnlineUsers(prev => { const n = new Set(prev); n.delete(userId); return n }))

    // Update last message in inbox in real time
    socket.on('receive_message', (msg) => {
      setConversations(prev => prev.map(c =>
        c.user?._id?.toString() === msg.from
          ? { ...c, lastMessage: { text: msg.text, createdAt: msg.createdAt, isFromMe: false }, unreadCount: (c.unreadCount || 0) + 1 }
          : c
      ))
    })

    return () => socket.disconnect()
  }, [])

  const formatTime = date => {
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' })
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const deleteConversation = async (e, otherId, convId) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await api.delete(`/chat/conversation/${otherId}`)
      setConversations(prev => prev.filter(c => c.conversationId !== convId))
      toast.success('Conversation deleted')
    } catch {
      toast.error('Could not delete')
    } finally {
      setDeletingConv(null)
    }
  }

  const totalUnread = conversations.reduce((a, c) => a + (c.unreadCount || 0), 0)
  const filtered = conversations.filter(c =>
    !search || c.user?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to right, rgba(110,193,228,0.12) 0%, rgba(255,255,255,1) 50%, rgba(249,202,218,0.15) 100%)' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {totalUnread > 0 ? <span className="text-[#6EC1E4] font-semibold">{totalUnread} unread</span> : 'All caught up ✓'}
            </p>
          </div>
          <Link to="/search" className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition flex items-center gap-2 shadow-sm">
            <i className="fas fa-plus"></i> New Chat
          </Link>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 mb-4">
          <i className="fas fa-search text-gray-300 text-sm"></i>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-300 bg-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 transition">
              <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </div>

        {/* Conversation list */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6EC1E4]"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <i className="fas fa-comments text-white text-2xl"></i>
              </div>
              <p className="font-semibold text-gray-700">{search ? 'No results found' : 'No conversations yet'}</p>
              <p className="text-sm text-gray-400 mt-1">{search ? 'Try a different name' : 'Find a babysitter and start chatting'}</p>
              {!search && (
                <Link to="/search" className="inline-block mt-4 gradient-bg text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-sm">
                  Find Sitters
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filtered.map((conv, i) => {
                const other = conv.user
                const last = conv.lastMessage
                const isOnline = onlineUsers.has(other?._id?.toString())
                const isDeleting = deletingConv === conv.conversationId
                return (
                  <li key={conv.conversationId || i} className="relative group">
                    <Link
                      to={`/chat/${other?._id}`}
                      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/80 transition ${conv.unreadCount > 0 ? 'bg-[#6EC1E4]/4' : ''}`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={other?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.name || 'U')}&background=6EC1E4&color=fff&size=80`}
                          alt={other?.name}
                          className="w-13 h-13 rounded-2xl object-cover shadow-sm"
                          style={{ width: '52px', height: '52px' }}
                        />
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full shadow-sm"></span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`font-semibold text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {other?.name || 'Unknown User'}
                          </p>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {last?.createdAt ? formatTime(last.createdAt) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                            {last?.isFromMe && <span className="text-gray-400">You: </span>}
                            {last?.text || (last?.messageType !== 'text' ? `📎 ${last?.messageType}` : 'No messages yet')}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {conv.unreadCount > 0 && (
                              <span className="w-5 h-5 gradient-bg text-white text-xs rounded-full flex items-center justify-center font-bold shadow-sm">
                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-300 mt-0.5 capitalize">{other?.role}</p>
                      </div>
                    </Link>

                    {/* Delete button — shows on hover */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition">
                      {isDeleting ? (
                        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-md">
                          <span className="text-xs text-gray-500">Delete?</span>
                          <button
                            onClick={e => deleteConversation(e, other?._id, conv.conversationId)}
                            className="text-xs text-red-500 font-bold hover:text-red-600"
                          >Yes</button>
                          <button
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setDeletingConv(null) }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >No</button>
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.preventDefault(); e.stopPropagation(); setDeletingConv(conv.conversationId) }}
                          className="w-8 h-8 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-400 hover:border-red-200 transition shadow-sm"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            {filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
