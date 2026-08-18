import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import BookingsPage from './pages/BookingsPage'
import RepairOrdersPage from './pages/RepairOrdersPage'
import InventoryPage from './pages/InventoryPage'

export default function App() {
  const { user } = useAuth()

  // Not signed in: every route collapses to the login screen. The backend does
  // not rely on this - every /api call is checked server-side regardless.
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/repair-orders" element={<RepairOrdersPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="*" element={<Navigate to="/bookings" replace />} />
      </Route>
    </Routes>
  )
}
