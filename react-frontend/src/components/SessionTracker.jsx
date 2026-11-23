/**
 * SessionTracker — Babysitter side UI only
 * All GPS + socket logic lives in SessionContext (app-level, background).
 */
import { useEffect } from 'react'
import { useSession } from '../context/SessionContext'

const ARRIVAL_RADIUS_M = 200

export default function SessionTracker({ booking }) {
  const ctx = useSession()

  // Keep context in sync with the freshest booking prop from the dashboard
  useEffect(() => {
    if (ctx && booking) ctx.setActiveBooking(booking)
  }, [booking?._id, booking?.status])

  if (!ctx) return null
  const { phase, distanceM, sosTriggered, stopTracking, triggerSOS } = ctx

  if (!['confirmed', 'in-progress'].includes(booking?.status)) return null

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-lg">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ background: phase === 'tracking' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : phase === 'ended' ? '#f1f5f9' : 'linear-gradient(135deg, #6EC1E4, #F9CADA)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <i className={`fas ${phase === 'tracking' ? 'fa-satellite-dish' : phase === 'ended' ? 'fa-lock' : 'fa-map-marker-alt'} text-white text-lg`} />
          </div>
          <div>
            <p className="text-white font-bold text-sm">
              {phase === 'idle'        && 'Session GPS'}
              {phase === 'approaching' && 'Heading to Session'}
              {phase === 'tracking'    && 'Live GPS Active'}
              {phase === 'ended'       && 'GPS Stopped'}
            </p>
            <p className="text-white/80 text-xs">
              {phase === 'idle'        && 'Getting your location...'}
              {phase === 'approaching' && (distanceM !== null ? `${distanceM > 1000 ? (distanceM/1000).toFixed(1)+'km' : distanceM+'m'} from destination` : 'Calculating...')}
              {phase === 'tracking'    && 'Parent can see your location'}
              {phase === 'ended'       && 'Your location is private'}
            </p>
          </div>
        </div>
        {phase === 'tracking' && (
          <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold">LIVE</span>
          </div>
        )}
      </div>

      <div className="p-5 bg-white space-y-4">
        {/* Distance bar */}
        {phase === 'approaching' && distanceM !== null && (
          <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
            <i className="fas fa-route text-[#6EC1E4] text-lg" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">
                {distanceM <= ARRIVAL_RADIUS_M
                  ? '✅ You have arrived! Starting tracking...'
                  : `${distanceM > 1000 ? (distanceM/1000).toFixed(1)+' km' : distanceM+' m'} from parent's home`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Auto-starts within {ARRIVAL_RADIUS_M}m</p>
            </div>
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#6EC1E4] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, Math.min(100, 100 - (distanceM / 500) * 100))}%` }} />
            </div>
          </div>
        )}

        {phase === 'tracking' && (
          <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 rounded-xl p-3 border border-green-100">
            <i className="fas fa-satellite-dish text-green-500 mt-0.5" />
            <p>GPS is running <strong>in the background</strong>. You can navigate freely — tracking continues.</p>
          </div>
        )}

        {(phase === 'idle' || phase === 'approaching') && (
          <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
            <i className="fas fa-shield-alt text-green-500 mt-0.5" />
            <p>Your location is <strong className="text-gray-600">only shared with the parent</strong> during the active session.</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          {(phase === 'idle') && (
            <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gray-50 text-gray-500 border border-gray-200">
              <i className="fas fa-spinner fa-spin text-xs" /> Getting GPS signal...
            </div>
          )}
          {phase === 'approaching' && (
            <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-blue-50 text-blue-600 border border-blue-100">
              <i className="fas fa-spinner fa-spin text-xs" /> Auto-starting when you arrive...
            </div>
          )}
          {phase === 'tracking' && (
            <button onClick={stopTracking}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
              <i className="fas fa-stop-circle" /> Stop Tracking
            </button>
          )}
          {phase === 'ended' && (
            <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gray-50 text-gray-400 border border-gray-200">
              <i className="fas fa-lock" /> Location Private
            </div>
          )}

          {phase !== 'ended' && (
            <button onClick={triggerSOS} disabled={sosTriggered}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition ${
                sosTriggered
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-lg shadow-red-200'
              }`}>
              {sosTriggered
                ? <><i className="fas fa-check" /> Sent</>
                : <><i className="fas fa-exclamation-triangle" /> SOS</>}
            </button>
          )}
        </div>

        {sosTriggered && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <i className="fas fa-check-circle text-red-500" />
            <p className="text-sm text-red-700 font-semibold">SOS alert sent to parent with your location.</p>
          </div>
        )}
      </div>
    </div>
  )
}
