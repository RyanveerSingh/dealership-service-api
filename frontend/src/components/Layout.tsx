import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand" style={{ color: '#fff', textDecoration: 'none' }}>
          Dealership Service
        </Link>
        <nav>
          <NavLink to="/app/bookings">Bookings</NavLink>
          <NavLink to="/app/repair-orders">Repair Orders</NavLink>
          <NavLink to="/app/inventory">Inventory</NavLink>
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
