import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

// ─── Babysitter singleton socket ────────────────────────────────────────────
// Persists across navigation so the stream keeps running in the background.
let _sitterSocket = null
let _sitterStream = null   // active MediaStream
let _sitterPc     = null   // active RTCPeerConnection
const _sitterListeners = new Set() // components that want status updates

function getSitterSocket() {
  if (_sitterSocket?.connected) return _sitterSocket
  const token = localStorage.getItem('token')
  if (!token) return null
  _sitterSocket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] })
  return _sitterSocket
}

function notifySitterListeners(status, error = '') {
  _sitterListeners.forEach(fn => fn(status, error))
}

// ─── Babysitter stream manager (singleton) ──────────────────────────────────
export function stopSitterStream(roomId) {
  const socket = _sitterSocket
  if (socket) {
    socket.emit('stream:end', { roomId })
    socket.off('stream:watch_ready')
    socket.off('stream:signal')
  }
  if (_sitterPc) {
    _sitterPc.ontrack = null
    _sitterPc.onicecandidate = null
    _sitterPc.oniceconnectionstatechange = null
    _sitterPc.close()
    _sitterPc = null
  }
  if (_sitterStream) {
    _sitterStream.getTracks().forEach(t => t.stop())
    _sitterStream = null
  }
  notifySitterListeners('ended')
}

function initSitterStream(roomId) {
  const socket = getSitterSocket()
  if (!socket) return

  const startCamera = async () => {
    try {
      if (!_sitterStream) {
        _sitterStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      }
      notifySitterListeners('connecting')
      socket.emit('stream:join', { roomId })
      socket.emit('stream:ready', { roomId })
    } catch {
      notifySitterListeners('error', 'Camera access denied. Please allow camera/mic and retry.')
    }
  }

  const makeOffer = async () => {
    // Always tear down old PC before making a new one
    if (_sitterPc) {
      _sitterPc.ontrack = null
      _sitterPc.onicecandidate = null
      _sitterPc.oniceconnectionstatechange = null
      _sitterPc.close()
      _sitterPc = null
    }
    if (!_sitterStream) return

    const pc = new RTCPeerConnection(RTC_CONFIG)
    _sitterPc = pc
    _sitterStream.getTracks().forEach(t => pc.addTrack(t, _sitterStream))

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('stream:signal', { roomId, signal: { type: 'candidate', candidate } })
    }
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')
        notifySitterListeners('live')
      if (pc.iceConnectionState === 'failed')
        notifySitterListeners('error', 'ICE connection failed')
      if (pc.iceConnectionState === 'disconnected')
        notifySitterListeners('connecting')
    }

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit('stream:signal', { roomId, signal: { type: 'offer', sdp: pc.localDescription.sdp } })
    } catch (e) {
      notifySitterListeners('error', e.message)
    }
  }

  // Remove old listeners to avoid duplicates on re-init
  socket.off('connect')
  socket.off('stream:watch_ready')
  socket.off('stream:signal')

  socket.on('connect', () => {
    socket.emit('stream:join', { roomId })
    startCamera()
  })

  socket.on('stream:watch_ready', () => {
    // Parent joined (or rejoined) — always send a fresh offer
    makeOffer()
  })

  socket.on('stream:signal', async ({ signal }) => {
    if (!_sitterPc) return
    try {
      if (signal.type === 'answer')
        await _sitterPc.setRemoteDescription(new RTCSessionDescription(signal))
      else if (signal.type === 'candidate')
        await _sitterPc.addIceCandidate(new RTCIceCandidate(signal.candidate))
    } catch (e) { console.error('[Stream] sitter signal err:', e) }
  })

  // If already connected, start immediately
  if (socket.connected) {
    socket.emit('stream:join', { roomId })
    startCamera()
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LiveStream({ bookingId, role }) {
  const [status, setStatus] = useState('idle')
  const [error, setError]   = useState('')

  const localVideoRef  = useRef(null)
  const remoteVideoRef = useRef(null)
  const socketRef      = useRef(null)
  const pcRef          = useRef(null)
  const remoteStreamRef = useRef(null)
  const roomId = `stream_${bookingId}`

  // ── BABYSITTER ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (role !== 'babysitter') return

    // Register this component as a listener for status updates
    const onStatus = (s, e = '') => {
      setStatus(s)
      setError(e)
    }
    _sitterListeners.add(onStatus)

    // Attach local video whenever stream is available
    if (_sitterStream && localVideoRef.current) {
      localVideoRef.current.srcObject = _sitterStream
    }

    // Start the singleton stream manager
    initSitterStream(roomId)

    return () => {
      _sitterListeners.delete(onStatus)
      // Do NOT stop the stream or disconnect socket — it runs in background
    }
  }, [role, roomId])

  // Keep local video in sync when _sitterStream becomes available
  useEffect(() => {
    if (role !== 'babysitter') return
    if (status !== 'idle' && _sitterStream && localVideoRef.current) {
      localVideoRef.current.srcObject = _sitterStream
    }
  }, [status, role])

  // ── PARENT ─────────────────────────────────────────────────────────────────
  const resetPeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null
      pcRef.current.onicecandidate = null
      pcRef.current.oniceconnectionstatechange = null
      pcRef.current.close()
      pcRef.current = null
    }
    remoteStreamRef.current = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    if (role !== 'parent') return

    const token = localStorage.getItem('token')
    if (!token) { setError('Not logged in'); return }

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      // Join room AND immediately signal readiness — handles the rejoin case
      // where babysitter is already streaming and won't re-emit stream:ready
      socket.emit('stream:join', { roomId })
      socket.emit('stream:watch_ready', { roomId })
      setStatus('connecting')
    })

    socket.on('stream:ready', () => {
      // Babysitter just (re)started camera — request stream
      resetPeer()
      setStatus('connecting')
      socket.emit('stream:watch_ready', { roomId })
    })

    socket.on('stream:signal', async ({ signal }) => {
      try {
        if (signal.type === 'offer') {
          resetPeer()
          const pc = new RTCPeerConnection(RTC_CONFIG)
          pcRef.current = pc

          pc.ontrack = ({ streams }) => {
            if (!streams[0]) return
            remoteStreamRef.current = streams[0]
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = streams[0]
            setStatus('live')
          }
          pc.onicecandidate = ({ candidate }) => {
            if (candidate) socket.emit('stream:signal', { roomId, signal: { type: 'candidate', candidate } })
          }
          pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed')       { setStatus('error'); setError('ICE failed') }
            if (pc.iceConnectionState === 'disconnected') setStatus('connecting')
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('stream:signal', { roomId, signal: { type: 'answer', sdp: pc.localDescription.sdp } })

        } else if (signal.type === 'candidate' && pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate))
        }
      } catch (e) { console.error('[Stream] parent signal err:', e); setStatus('error'); setError(e.message) }
    })

    socket.on('stream:ended', () => { resetPeer(); setStatus('ended') })
    socket.on('connect_error', e => { setStatus('error'); setError('Socket: ' + e.message) })

    return () => {
      resetPeer()
      socket.disconnect()
    }
  }, [bookingId, role, resetPeer, roomId])

  // Re-attach remote stream after re-render
  useEffect(() => {
    if (status === 'live' && remoteStreamRef.current && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current
    }
  }, [status])

  // ── BABYSITTER UI ──────────────────────────────────────────────────────────
  if (role === 'babysitter') return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      <div className="relative aspect-video bg-black">
        <video ref={localVideoRef} autoPlay muted playsInline
          className={`w-full h-full object-cover ${status === 'idle' ? 'hidden' : ''}`} />

        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <i className="fas fa-spinner fa-spin text-white text-2xl" />
            <p className="text-white/70 text-sm">Starting camera...</p>
          </div>
        )}
        {status === 'connecting' && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-yellow-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            <i className="fas fa-spinner fa-spin text-[10px]" /> Waiting for parent...
          </div>
        )}
        {status === 'live' && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <i className="fas fa-exclamation-triangle text-red-400 text-3xl" />
            <p className="text-white/80 text-sm text-center px-4">{error}</p>
            <button onClick={() => initSitterStream(roomId)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition">
              <i className="fas fa-redo" /> Retry Camera
            </button>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-white font-semibold text-sm">
          {status === 'live'       ? 'Streaming to parent' :
           status === 'connecting' ? 'Camera on — waiting for parent to open Live Camera tab' :
           status === 'error'      ? 'Camera error' : 'Starting camera...'}
        </p>
        <p className="text-white/50 text-xs mt-0.5">Stream runs in background — you can navigate freely</p>
      </div>
    </div>
  )

  // ── PARENT UI ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      <div className="relative aspect-video bg-black">
        <video ref={remoteVideoRef} autoPlay playsInline
          className={`w-full h-full object-cover ${status !== 'live' ? 'hidden' : ''}`} />

        {(status === 'idle' || status === 'connecting') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <i className={`fas ${status === 'connecting' ? 'fa-spinner fa-spin' : 'fa-eye'} text-white text-3xl`} />
            <p className="text-white font-semibold text-sm">
              {status === 'connecting' ? 'Connecting to stream...' : 'Waiting for babysitter camera'}
            </p>
            {status === 'idle' && <p className="text-white/50 text-xs">Stream starts automatically</p>}
          </div>
        )}
        {status === 'live' && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </div>
        )}
        {status === 'ended' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
            <i className="fas fa-video-slash text-white text-3xl" />
            <p className="text-white font-semibold">Stream ended</p>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 px-6 text-center">
            <i className="fas fa-exclamation-triangle text-red-400 text-3xl" />
            <p className="text-white font-semibold text-sm">Connection failed</p>
            {error && <p className="text-white/60 text-xs mt-1">{error}</p>}
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-white font-semibold text-sm">
          {status === 'live'       ? 'Live feed from babysitter' :
           status === 'connecting' ? 'Connecting...' :
           status === 'ended'      ? 'Stream ended' :
           status === 'error'      ? 'Connection failed' :
           'Waiting for babysitter camera to start'}
        </p>
        <p className="text-white/50 text-xs mt-0.5">
          {status === 'live' ? 'Real-time camera feed — private to you only' :
           'Reconnects automatically when you open this tab'}
        </p>
      </div>
    </div>
  )
}
