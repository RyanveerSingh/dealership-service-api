import { Navigate, Route, Routes } from 'react-router-dom'
import SitePage from './site/SitePage'
import AppLayout from './app/AppLayout'
import LoginPage from './app/LoginPage'
import BookingsPage from './app/BookingsPage'
import RepairOrdersPage from './app/RepairOrdersPage'
import InventoryPage from './app/InventoryPage'
import CustomersPage from './app/CustomersPage'
import { useAuth } from './auth/AuthContext'

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public front door. */}
      <Route path="/" element={<SitePage />} />

      <Route
        path="/login"
        element={user ? <Navigate to="/app/bookings" replace /> : <LoginPage />}
      />

      {/* Everything under /app needs a session. This is convenience, not
          security: every /api call is authorised server-side regardless of
          what the router permits. */}
      <Route
        path="/app"
        element={user ? <AppLayout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/app/bookings" replace />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="repair-orders" element={<RepairOrdersPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="customers" element={<CustomersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
