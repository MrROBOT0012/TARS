import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import PcTopBar from './PcTopBar.jsx'
import TopBar from './TopBar.jsx'
import BottomNav from './BottomNav.jsx'
import { NAV_ITEMS } from '../../lib/navConfig'
import { useState } from 'react'
import QuickActionSheet from '../ui/QuickActionSheet.jsx'
import InstallBanner from '../ui/InstallBanner.jsx'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [quickActionOpen, setQuickActionOpen] = useState(false)
  const current = NAV_ITEMS.find((i) => i.path === location.pathname)
    ?? (location.pathname === '/' ? NAV_ITEMS[0] : null)

  return (
    <div className="app-root">
      <InstallBanner />
      <div className="app-shell">
        <Sidebar />
        <div className="main-area">
          <PcTopBar title={current?.label ?? 'TARS'} />
          <TopBar />
          <main className="page-content">
            <Outlet />
          </main>
        </div>
        <BottomNav onQuickAction={() => setQuickActionOpen(true)} />
        {quickActionOpen && (
          <QuickActionSheet
            onClose={() => setQuickActionOpen(false)}
            onNavigate={(path) => {
              setQuickActionOpen(false)
              navigate(path)
            }}
          />
        )}
      </div>
    </div>
  )
}
