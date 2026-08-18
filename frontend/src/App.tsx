import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import LandingPage from './landing/LandingPage'
import LoginPage from './pages/LoginPage'
import BookingsPage from './pages/BookingsPage'
import RepairOrdersPage from './pages/RepairOrdersPage'
import InventoryPage from './pages/InventoryPage'

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public. The landing page is the front door and must render for a
          visitor with no token. */}
      <Route path="/" element={<LandingPage />} />

      {/* Everything under /app needs a session. This is convenience, not
          security: every /api call is authorised server-side regardless of
          what the router allows. */}
      <Route
        path="/app"
        element={user ? <Layout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/app/bookings" replace />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="repair-orders" element={<RepairOrdersPage />} />
        <Route path="inventory" element={<InventoryPage />} />
      </Route>

      <Route
        path="/login"
        element={user ? <Navigate to="/app/bookings" replace /> : <LoginPage />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
