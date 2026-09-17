import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import AIChatbot from './components/AIChatbot'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Search from './pages/Search'
import Profile from './pages/Profile'
import ParentDashboard from './pages/ParentDashboard'
import BabysitterDashboard from './pages/BabysitterDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Chat from './pages/Chat'
import ChatInbox from './pages/ChatInbox'
import SmartMatch from './pages/SmartMatch'

function RedirectDashboard() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'babysitter') return <Navigate to="/babysitter-dashboard" replace />
  return <Navigate to="/parent-dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AIChatbot />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/search" element={<Search />} />
          <Route path="/smart-match" element={<SmartMatch />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/dashboard" element={<RedirectDashboard />} />
          <Route path="/parent-dashboard" element={
            <ProtectedRoute role="parent"><ParentDashboard /></ProtectedRoute>
          } />
          <Route path="/babysitter-dashboard" element={
            <ProtectedRoute role="babysitter"><BabysitterDashboard /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute><ChatInbox /></ProtectedRoute>
          } />
          <Route path="/chat/:userId" element={
            <ProtectedRoute><Chat /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
