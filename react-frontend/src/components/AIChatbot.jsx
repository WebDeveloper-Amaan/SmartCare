import { useState, useRef, useEffect } from 'react'
import api from '../services/api'

const QUICK_PROMPTS = [
  { label: '🔍 Find a sitter', text: 'Help me find a babysitter' },
  { label: '💰 Pricing info', text: 'What are the typical rates?' },
  { label: '✅ Is it safe?', text: 'How are babysitters verified?' },
  { label: '📅 How to book', text: 'How do I book a babysitter?' },
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-2 h-2 rounded-full bg-[#6EC1E4] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow-sm">
          <i className="fas fa-robot text-white" style={{ fontSize: '11px' }}></i>
        </div>
      )}
      <div
        className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'gradient-bg text-white rounded-br-sm'
            : 'bg-white text-gray-700 border border-gray-100 rounded-bl-sm'
        }`}
        dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>')
        }}
      />
    </div>
  )
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! 👋 I'm the **SmartCare AI Assistant**.\n\nI can help you find the perfect babysitter, answer questions about bookings, safety, and more. How can I help?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setShowQuick(false)

    try {
      const { data } = await api.post('/ai/chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content }))
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      if (!open) setUnread(u => u + 1)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
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
    setMessages([{ role: 'assistant', content: "Hi! 👋 I'm the **SmartCare AI Assistant**.\n\nI can help you find the perfect babysitter, answer questions about bookings, safety, and more. How can I help?" }])
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
          className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ height: '520px', background: 'linear-gradient(to bottom, rgba(110,193,228,0.06), rgba(255,255,255,1))' }}
        >
          {/* Header */}
          <div className="gradient-bg px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-robot text-white text-base"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">SmartCare AI</p>
              <p className="text-white/75 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse inline-block"></span>
                Always online · Powered by AI
              </p>
            </div>
            <button onClick={clearChat} className="text-white/70 hover:text-white transition text-xs px-2 py-1 rounded-lg hover:bg-white/10" title="Clear chat">
              <i className="fas fa-redo-alt"></i>
            </button>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition">
              <i className="fas fa-times text-base"></i>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ background: 'rgba(248,250,252,0.8)' }}>
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && (
              <div className="flex justify-start mb-2">
                <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <i className="fas fa-robot text-white" style={{ fontSize: '11px' }}></i>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Quick prompts */}
            {showQuick && !loading && (
              <div className="pt-2 pb-1">
                <p className="text-xs text-gray-400 mb-2 text-center">Quick questions</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_PROMPTS.map(q => (
                    <button
                      key={q.text}
                      onClick={() => sendMessage(q.text)}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-white border border-[#6EC1E4]/30 text-gray-600 hover:border-[#6EC1E4] hover:text-[#6EC1E4] hover:bg-[#6EC1E4]/5 transition font-medium shadow-sm"
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
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-200 focus-within:border-[#6EC1E4] transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask me anything..."
                rows={1}
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 resize-none max-h-20"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition hover:opacity-90 active:scale-95"
              >
                <i className="fas fa-paper-plane text-white" style={{ fontSize: '12px' }}></i>
              </button>
            </div>
            <p className="text-center text-gray-300 text-xs mt-1.5">SmartCare AI · Press Enter to send</p>
          </div>
        </div>
      )}
    </>
  )
}
