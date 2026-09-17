import { useState, useRef, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/useAuth'

// Initials avatar fallback
function InitialsAvatar({ name, size = 'lg' }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const sizeClass = size === 'lg' ? 'w-24 h-24 text-2xl' : 'w-16 h-16 text-lg'
  return (
    <div className={`${sizeClass} rounded-full gradient-bg flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  )
}

export default function PhotoUpload({ onUpload }) {
  const { user, updateUser } = useAuth()
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  const handlePick = e => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      const { data } = await api.post('/auth/upload-photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Photo updated!')
      setPreview(null)
      setFile(null)
      if (updateUser) updateUser({ photo: data.photo })
      if (onUpload) onUpload(data.photo)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handlePickWrapped = useCallback(handlePick, [])
  const handleCancelPreview = useCallback(() => { setPreview(null); setFile(null) }, [])
  const handleCameraClick = useCallback(() => inputRef.current.click(), [])

  const currentPhoto = preview || user?.photo

  return (
    <div className="flex items-center gap-5 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
          />
        ) : (
          <InitialsAvatar name={user?.name} />
        )}
        {/* Camera overlay */}
        <button
          type="button"
          onClick={handleCameraClick}
          className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
          title="Change photo"
        >
          <i className="fas fa-camera text-[#6EC1E4] text-sm"></i>
        </button>
      </div>

      {/* Info + actions */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleCameraClick}
            className="text-xs px-3 py-1.5 border-2 border-[#6EC1E4] text-[#6EC1E4] rounded-lg font-semibold hover:bg-[#6EC1E4]/10 transition"
          >
            {preview ? 'Change' : 'Upload Photo'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="text-xs px-3 py-1.5 gradient-bg text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {uploading ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-check"></i> Save Photo</>}
            </button>
          )}
          {preview && (
            <button
              type="button"
              onClick={handleCancelPreview}
              className="text-xs px-3 py-1.5 text-gray-400 hover:text-gray-600 transition"
            >
              Cancel
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">JPG, PNG or WebP · Max 5MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePickWrapped}
      />
    </div>
  )
}

export { InitialsAvatar }
