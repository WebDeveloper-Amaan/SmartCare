import { useState, useRef, useEffect } from 'react'
import api from '../services/api'

const QUICK_PROMPTS = [
  { label: '🔍 Find a sitter', text: 'Help me find a babysitter' },
  { label: '💰 Pricing info', text: 'What are the typical rates?' },
  { label: '✅ Is it safe?', text: 'How are babysitters verified?' },
  { label: '📅 How to book', text: 'How do I book a babysitter?' },
]

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Renders **bold**, bullet lists, line breaks
function renderContent(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:12px;list-style:disc">$1</li>')
    .replace(/(<li.*<\/li>)/gs, '<ul style="margin:4px 0">$1</ul>')
    .replace(/\n/g, '<br/>')
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-2 h-2 rounded-full bg-[#6EC1E4] animate-bounce"
          style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 gap-2`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <i className="fas fa-robot text-white" style={{ fontSize: '10px' }}></i>
        </div>
      )}
      <div className="flex flex-col gap-0.5" style={{ maxWidth: '78%' }}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'gradient-bg text-white rounded-tr-sm'
              : 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm'
          }`}
          dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
        />
        <span className={`text-[10px] text-gray-400 ${isUser ? 'text-right' : 'text-left'} px-1`}>
          {msg.time}
        </span>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6EC1E4] to-[#F9CADA] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <i className="fas fa-user text-white" style={{ fontSize: '10px' }}></i>
        </div>
      )}
    </div>
  )
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      time: formatTime(),
      content: "Hi! 👋 I'm the **SmartCare AI Assistant**.\n\nI can help you find the perfect babysitter, answer questions about bookings, safety, and more. How can I help?"
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const [unread, setUnread] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => { setIsVisible(true); inputRef.current?.focus() }, 10)
    } else {
      setIsVisible(false)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg = { role: 'user', content, time: formatTime() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setShowQuick(false)

    try {
      const { data } = await api.post('/ai/chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content }))
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, time: formatTime() }])
      if (!open) setUnread(u => u + 1)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        time: formatTime(),
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment! 😊"
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      time: formatTime(),
      content: "Hi! 👋 I'm the **SmartCare AI Assistant**.\n\nI can help you find the perfect babysitter, answer questions about bookings, safety, and more. How can I help?"
    }])
    setShowQuick(true)
  }

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-bg shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Open AI Assistant"
      >
        <i className={`fas ${open ? 'fa-times' : 'fa-robot'} text-white text-xl transition-all duration-200`}></i>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">
            {unread}
          </span>
        )}
        {!open && (
          <span className="absolute -top-1 -left-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {/* ── Chat window ── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col rounded-3xl shadow-2xl overflow-hidden"
          style={{
            width: '370px',
            maxWidth: 'calc(100vw - 24px)',
            height: '540px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            background: '#f8fafc'
          }}
        >
          {/* Header */}
          <div className="gradient-bg px-4 py-3.5 flex items-center gap-3 flex-shrink-0 shadow-md">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                <i className="fas fa-robot text-white text-base"></i>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">SmartCare AI</p>
              <p className="text-white/75 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse inline-block"></span>
                Online · Powered by Gemini
              </p>
            </div>
            <button onClick={clearChat}
              className="text-white/70 hover:text-white transition w-8 h-8 rounded-xl hover:bg-white/15 flex items-center justify-center"
              title="Clear chat">
              <i className="fas fa-redo-alt text-sm"></i>
            </button>
            <button onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition w-8 h-8 rounded-xl hover:bg-white/15 flex items-center justify-center">
              <i className="fas fa-times text-base"></i>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4"
            style={{ background: 'linear-gradient(to bottom, rgba(110,193,228,0.04), rgba(249,202,218,0.04))' }}>
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}

            {loading && (
              <div className="flex justify-start mb-3 gap-2">
                <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <i className="fas fa-robot text-white" style={{ fontSize: '10px' }}></i>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Quick prompts */}
            {showQuick && !loading && (
              <div className="mt-2 mb-1">
                <p className="text-xs text-gray-400 mb-2 text-center font-medium">Tap a question to get started</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_PROMPTS.map(q => (
                    <button
                      key={q.text}
                      onClick={() => sendMessage(q.text)}
                      className="text-left text-xs px-3 py-2.5 rounded-xl bg-white border border-[#6EC1E4]/25 text-gray-600 hover:border-[#6EC1E4] hover:text-[#6EC1E4] hover:bg-[#6EC1E4]/5 transition font-medium shadow-sm"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-3.5 py-2.5 border-2 border-gray-200 focus-within:border-[#6EC1E4] transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask me anything..."
                rows={1}
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 resize-none max-h-24"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition hover:opacity-90 active:scale-95 shadow-sm"
              >
                <i className="fas fa-paper-plane text-white" style={{ fontSize: '12px' }}></i>
              </button>
            </div>
            <p className="text-center text-gray-300 text-[10px] mt-1.5">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </>
  )
}
