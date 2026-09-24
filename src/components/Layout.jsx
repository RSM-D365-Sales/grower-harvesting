import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Sprout,
  CalendarDays,
  BarChart3,
  ArrowRightLeft,
  Menu,
  Package,
  Factory,
  ShoppingCart,
  Link2,
  Settings,
  Users,
  MapPin,
  LogOut,
  Shield,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import BluestemMark, { BluestemWordmark } from './BluestemMark'
import rsmLogo from '../assets/rsmus-logo.png'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/grow-cycles', label: 'Grow Cycles', icon: Sprout },
  { to: '/harvest-scheduling', label: 'Harvest Scheduling', icon: CalendarDays },
  { to: '/yield-management', label: 'Yield Management', icon: BarChart3 },
  { to: '/d365', label: 'D365 Sync Queue', icon: ArrowRightLeft },
]

const setupNavItems = [
  { to: '/setup/crops', label: 'Crops & Varieties', icon: Sprout },
  { to: '/setup/fields', label: 'Grower Blocks', icon: MapPin },
  { to: '/setup/team', label: 'Crews & Team', icon: Users },
]

const d365NavItems = [
  { to: '/d365/products', label: 'D365 Products', icon: Package },
  { to: '/d365/production-orders', label: 'Production Orders', icon: Factory },
  { to: '/d365/demand', label: 'Demand & Inventory', icon: ShoppingCart },
  { to: '/d365/mappings', label: 'Mappings & Log', icon: Link2 },
]

const navClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary-500/20 text-white shadow-[inset_3px_0_0_#009CDE]'
      : 'text-midnight-200 hover:bg-white/10 hover:text-white'
  }`

function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, isManager, logout } = useAuth()
  const roleLabel = user?.role === 'manager' ? 'Manager' : 'Operator'

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Midnight chrome per BRAND_GUIDE.md */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-midnight-900 text-white
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <BluestemMark className="w-8 h-8 shrink-0" />
            <BluestemWordmark onDark className="text-[22px]" />
          </div>
          <p className="mt-2.5 text-[13.5px] font-heading font-semibold">Grower Harvesting</p>
          <p className="text-[11.5px] text-midnight-300 italic">From the field, in real time.</p>
        </div>

        <nav className="mt-4 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={navClass}
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}

          {/* D365 F&SC Section */}
          <div className="pt-4 mt-4 border-t border-white/10">
            <p className="px-3 pb-2 text-[10px] uppercase tracking-wider text-midnight-400">D365 F&amp;SC · BFP-UAT</p>
            {d365NavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={navClass}
              >
                <Icon className="w-5 h-5" />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Setup Section — Manager Only */}
          {isManager && (
            <div className="pt-4 mt-4 border-t border-white/10">
              <p className="px-3 pb-2 text-[10px] uppercase tracking-wider text-midnight-400">
                <Settings className="w-3 h-3 inline mr-1" />Setup
              </p>
              {setupNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={navClass}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-xs text-midnight-200 min-w-0">
              <p className="font-medium truncate text-white">{user?.full_name}</p>
              <p className="flex items-center gap-1 text-midnight-300 mt-0.5">
                <Shield className="w-3 h-3" />
                {roleLabel}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-midnight-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Title ribbon — RSM sponsor mark sits at the right, left of the avatar (BRAND_GUIDE.md) */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-14 px-4 lg:px-6 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-[15px] font-heading font-semibold text-midnight-900">
            Grower Harvesting
          </h2>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full bg-primary-50 text-primary-600 text-[11px] font-medium">
              Bluestem Fresh Produce · HRT / GRP / HOL / SAL
            </span>
            <span className="hidden sm:flex items-center gap-2 pl-4 border-l border-gray-200">
              <span className="text-[11px] text-brand-grey">Powered by</span>
              <img src={rsmLogo} alt="RSM" className="h-[22px] w-auto" />
            </span>
            <span className="flex items-center gap-2.5 pl-4 border-l border-gray-200">
              <span className="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-semibold flex items-center justify-center">
                {initialsOf(user?.full_name)}
              </span>
              <span className="hidden lg:block leading-tight">
                <span className="block text-sm font-medium text-gray-800">{user?.full_name}</span>
                <span className="block text-[11px] text-gray-500">{roleLabel}</span>
              </span>
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
