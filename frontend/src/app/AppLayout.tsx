import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const NAV = [
  { to: '/app/bookings', label: 'Bookings' },
  { to: '/app/repair-orders', label: 'Repair orders' },
  { to: '/app/inventory', label: 'Inventory' },
  { to: '/app/customers', label: 'Customers' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-svh bg-ink">
      <header className="border-b" style={{ borderColor: 'var(--hairline)' }}>
        <div className="shell gutter flex h-16 flex-wrap items-center gap-x-8 gap-y-3">
          <Link to="/" className="font-display text-[0.95rem] text-chalk no-underline">
            Dealership<span className="text-champagne">·</span>Service
          </Link>

          <nav className="flex flex-wrap items-center gap-6">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                // The active route is marked with colour and a rule rather than
                // weight, so the row does not reflow as you move between tabs.
                className={({ isActive }) =>
                  `label pb-1 transition-colors ${isActive ? 'text-champagne' : 'hover:text-chalk'}`
                }
                style={({ isActive }) =>
                  isActive
                    ? { borderBottom: '1px solid var(--color-champagne)' }
                    : { borderBottom: '1px solid transparent' }
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <span className="flex-1" />

          <div className="flex items-center gap-4">
            <span className="text-right leading-tight">
              <span className="block text-[0.85rem] text-chalk">{user?.fullName}</span>
              <span className="label">{user?.role.replace('_', ' ')}</span>
            </span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="shell gutter py-10">
        <Outlet />
      </main>
    </div>
  )
}
