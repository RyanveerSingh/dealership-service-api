import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <>
      <header className="topbar">
        <span className="brand">Dealership Service</span>
        <nav>
          <NavLink to="/bookings">Bookings</NavLink>
          <NavLink to="/repair-orders">Repair Orders</NavLink>
          <NavLink to="/inventory">Inventory</NavLink>
        </nav>
        <span className="spacer" />
        <span className="who">
          <strong>{user?.fullName}</strong>
          {user?.role.replace('_', ' ').toLowerCase()}
        </span>
        <button className="secondary small" onClick={logout}>Sign out</button>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
