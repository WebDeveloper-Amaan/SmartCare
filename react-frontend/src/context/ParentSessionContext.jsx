/**
 * ParentSessionContext — Parent GPS receiver engine
 *
 * Lives at app root, never unmounts. Listens for session:started,
 * session:location, session:ended, session:sos from the babysitter
 * in the background regardless of which page the parent is viewing.
 * ParentSessionView is just a UI skin that reads from this context.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io as socketIO } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuth } from './useAuth'
import api from '../services/api'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const ParentSessionContext = createContext(null)
export const useParentSession = () => useContext(ParentSessionContext)

export function ParentSessionProvider({ children }) {
  const { user } = useAuth()

  // Map of bookingId → session state
  const [sessions, setSessions] = useState({}) // { [bookingId]: { phase, sitterPos, lastUpdate, sosAlert, sitterName, sitterPhoto, parentCoords } }
  const [activeBookings, setActiveBookings] = useState([])

  const socketRef = useRef(null)
  const lastUpdateRefs = useRef({}) // { [bookingId]: timestamp }

  const isParent = user?.role === 'parent'

  // ── Load active bookings on mount ─────────────────────────────────
  useEffect(() => {
    if (!isParent) return
    api.get('/bookings').then(({ data }) => {
      const active = (data.bookings || []).filter(b =>
        ['confirmed', 'in-progress'].includes(b.status)
      )
      setActiveBookings(active)
      // Init session state for each active booking
      setSessions(prev => {
        const next = { ...prev }
        active.forEach(b => {
          const id = b._id?.toString()
          if (!next[id]) {
            next[id] = {
              phase: 'waiting',
              sitterPos: null,
              lastUpdate: null,
              sosAlert: null,
              sitterName: b.babysitterName || b.babysitter?.name || 'Babysitter',
              sitterPhoto: b.babysitter?.photo || null,
              parentCoords: b.coordinates || null,
            }
          }
        })
        return next
      })
    }).catch(() => {})
  }, [isParent])

  // ── Socket (singleton) ────────────────────────────────────────────
  useEffect(() => {
    if (!isParent) return
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = socketIO(SOCKET_URL, { auth: { token }, transports: ['websocket'] })
    socketRef.current = socket

    socket.on('session:started', ({ bookingId: bid, lat, lng, sitterName }) => {
      const id = bid?.toString()
      lastUpdateRefs.current[id] = Date.now()
      setSessions(prev => ({
        ...prev,
        [id]: { ...(prev[id] || {}), phase: 'live', sitterPos: { lat, lng }, lastUpdate: Date.now() }
      }))
      toast.success(`📍 ${sitterName || 'Babysitter'} has arrived! GPS tracking started.`, { duration: 5000 })
    })

    socket.on('session:location', ({ bookingId: bid, lat, lng }) => {
      const id = bid?.toString()
      lastUpdateRefs.current[id] = Date.now()
      setSessions(prev => ({
        ...prev,
        [id]: { ...(prev[id] || {}), phase: 'live', sitterPos: { lat, lng }, lastUpdate: Date.now() }
      }))
    })

    socket.on('session:ended', ({ bookingId: bid }) => {
      const id = bid?.toString()
      setSessions(prev => ({
        ...prev,
        [id]: { ...(prev[id] || {}), phase: 'ended' }
      }))
      toast('🔒 GPS tracking ended by babysitter.', { icon: '🔒' })
    })

    socket.on('session:sos', ({ bookingId: bid, lat, lng, message, sitterName }) => {
      const id = bid?.toString()
      const name = sitterName || sessions[id]?.sitterName || 'Babysitter'
      setSessions(prev => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          sosAlert: { sitterName: name, lat, lng, message, time: Date.now() },
          ...(lat && lng ? { sitterPos: { lat, lng } } : {})
        }
      }))
      toast.error(`🚨 SOS from ${name}! ${message}`, { duration: 10000 })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isParent])

  const dismissSOS = useCallback((bookingId) => {
    const id = bookingId?.toString()
    setSessions(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), sosAlert: null }
    }))
  }, [])

  const getSession = useCallback((bookingId) => {
    return sessions[bookingId?.toString()] || null
  }, [sessions])

  const getDistanceM = useCallback((bookingId) => {
    const s = sessions[bookingId?.toString()]
    if (!s?.sitterPos || !s?.parentCoords?.lat) return null
    return Math.round(haversine(s.sitterPos.lat, s.sitterPos.lng, s.parentCoords.lat, s.parentCoords.lng))
  }, [sessions])

  return (
    <ParentSessionContext.Provider value={{
      sessions, activeBookings, getSession, getDistanceM, dismissSOS
    }}>
      {children}
    </ParentSessionContext.Provider>
  )
}
