/**
 * ParentSessionView — Parent side UI only
 * All socket listening lives in ParentSessionContext (app-level, background).
 */
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { useParentSession } from '../context/ParentSessionContext'

export default function ParentSessionView({ booking }) {
  const ctx = useParentSession()
  if (!ctx) return null

  const bookingId = booking?._id?.toString()
  const session = ctx.getSession(bookingId)
  const distanceM = ctx.getDistanceM(bookingId)

  const phase      = session?.phase      ?? 'waiting'
  const sitterPos  = session?.sitterPos  ?? null
  const lastUpdate = session?.lastUpdate ?? null
  const sosAlert   = session?.sosAlert   ?? null
  const sitterName = session?.sitterName ?? booking?.babysitterName ?? 'Babysitter'
  const sitterPhoto = session?.sitterPhoto ?? booking?.babysitter?.photo ?? null
  const parentCoords = session?.parentCoords ?? booking?.coordinates ?? null

  // Stale: no update in 15s
  const stale = phase === 'live' && lastUpdate && Date.now() - lastUpdate > 15000

  if (!['confirmed', 'in-progress'].includes(booking?.status)) return null

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-lg">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ background: phase === 'live' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : phase === 'ended' ? '#f1f5f9' : 'linear-gradient(135deg, #6EC1E4, #F9CADA)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <i className={`fas ${phase === 'live' ? 'fa-satellite-dish' : phase === 'ended' ? 'fa-lock' : 'fa-map-marker-alt'} text-white text-lg`} />
          </div>
          <div>
            <p className="text-white font-bold text-sm">
              {phase === 'waiting' && 'Waiting for Babysitter'}
              {phase === 'live'    && 'Live GPS Active'}
              {phase === 'ended'   && 'Session Ended'}
            </p>
            <p className="text-white/80 text-xs">
              {phase === 'waiting' && 'Map activates when babysitter arrives'}
              {phase === 'live'    && (lastUpdate ? `Updated ${Math.round((Date.now() - lastUpdate) / 1000)}s ago` : 'Receiving location...')}
              {phase === 'ended'   && 'Babysitter stopped sharing location'}
            </p>
          </div>
        </div>
        {phase === 'live' && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${stale ? 'bg-yellow-400/80' : 'bg-white/20'}`}>
            <span className={`w-2 h-2 rounded-full ${stale ? 'bg-yellow-900' : 'bg-white animate-pulse'}`} />
            <span className="text-white text-xs font-bold">{stale ? 'SLOW' : 'LIVE'}</span>
          </div>
        )}
      </div>

      {/* SOS Alert Banner */}
      {sosAlert && (
        <div className="bg-red-500 px-5 py-3 flex items-center gap-3">
          <i className="fas fa-exclamation-triangle text-white text-xl animate-pulse" />
          <div className="flex-1">
            <p className="text-white font-black text-sm">🚨 SOS ALERT from {sosAlert.sitterName}</p>
            <p className="text-white/90 text-xs">{sosAlert.message}</p>
          </div>
          <button onClick={() => ctx.dismissSOS(bookingId)} className="text-white/70 hover:text-white text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Map */}
      <div style={{ height: 280 }} className="relative">
        {phase === 'waiting' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <i className="fas fa-map-marker-alt text-gray-300 text-3xl" />
            </div>
            <p className="text-gray-500 font-semibold text-sm">Waiting for babysitter to arrive</p>
            <p className="text-gray-400 text-xs">Map appears automatically — tracking runs in background</p>
          </div>
        ) : (
          <Map
            mapId="parent-session-map"
            defaultCenter={sitterPos || parentCoords || { lat: 28.6139, lng: 77.2090 }}
            center={sitterPos || undefined}
            defaultZoom={15}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: '100%', height: '100%' }}
          >
            {sitterPos && (
              <AdvancedMarker position={sitterPos}>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-4 border-white shadow-xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                    {sitterPhoto
                      ? <img src={sitterPhoto} alt={sitterName} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <i className="fas fa-user text-white text-lg" />
                        </div>
                    }
                  </div>
                  <div className="mt-1 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap">
                    {sitterName}
                  </div>
                </div>
              </AdvancedMarker>
            )}
            {parentCoords?.lat && (
              <AdvancedMarker position={parentCoords}>
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full border-4 border-white shadow-xl flex items-center justify-center bg-[#6EC1E4]">
                    <i className="fas fa-home text-white text-sm" />
                  </div>
                  <div className="mt-1 bg-[#6EC1E4] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap">
                    Your Home
                  </div>
                </div>
              </AdvancedMarker>
            )}
          </Map>
        )}
      </div>

      {/* Footer */}
      {phase === 'live' && (
        <div className="p-4 bg-white flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <i className="fas fa-route text-[#6EC1E4]" />
            {distanceM !== null
              ? <span>{distanceM > 1000 ? (distanceM / 1000).toFixed(1) + ' km' : distanceM + ' m'} from your home</span>
              : <span>Calculating distance...</span>
            }
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <i className="fas fa-shield-alt text-green-500" />
            Private — only visible to you
          </div>
        </div>
      )}
      {phase === 'ended' && (
        <div className="p-4 bg-gray-50 text-center">
          <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
            <i className="fas fa-lock text-gray-400" /> Location sharing has ended
          </p>
        </div>
      )}
    </div>
  )
}
