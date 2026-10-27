import { useState, useEffect } from 'react'
import './App.css'
import api from './services/api'
import Login from './Login'

// Import Tabs
import DashboardTab from './components/DashboardTab'
import ProductsTab from './components/ProductsTab'
import ImportsTab from './components/ImportsTab'
import ExportsTab from './components/ExportsTab'
import ReportsTab from './components/ReportsTab'
import AITab from './components/AITab'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'))
  const [isLoadingUser, setIsLoadingUser] = useState(!!localStorage.getItem('access_token'))
  const [activeTab, setActiveTab] = useState('dashboard')
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (isAuthenticated) {
      loadUser()
    } else {
      setIsLoadingUser(false)
    }
  }, [isAuthenticated])

  const loadUser = async () => {
    try {
      setIsLoadingUser(true)
      const userData = await api.getCurrentUser()
      setUser(userData)
      
      // Default routing based on role
      const roleName = userData?.role?.name || ''
      if (roleName === 'STOREKEEPER') {
        setActiveTab('imports')
      } else if (roleName === 'ACCOUNTANT') {
        setActiveTab('reports')
      } else {
        setActiveTab('dashboard')
      }
    } catch (err) {
      console.error('Error loading user:', err)
      // Khi token sai, hết hạn hoặc không khớp -> tự động dọn sạch và về màn hình đăng nhập
      handleLogout()
    } finally {
      setIsLoadingUser(false)
    }
  }

  const handleLogout = () => {
    api.logout()
    setUser(null)
    setIsAuthenticated(false)
    setIsLoadingUser(false)
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {
      setIsAuthenticated(true)
      setIsLoadingUser(true)
    }} />
  }

  if (isLoadingUser) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#07111f',
        color: '#e2e8f0',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          border: '3px solid rgba(59, 130, 246, 0.2)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '16px', color: '#94a3b8', fontSize: '0.95rem' }}>Đang tải dữ liệu hệ thống...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const roleName = user?.role?.name || 'ADMIN'
  
  const canViewDashboard = roleName === 'ADMIN' || roleName === 'ACCOUNTANT' || roleName === 'STOREKEEPER'
  const canViewProducts = true // Tất cả các vai trò đều có thể xem hàng hóa
  const canViewImportsExports = roleName === 'ADMIN' || roleName === 'STOREKEEPER'
  const canViewReports = roleName === 'ADMIN' || roleName === 'ACCOUNTANT'
  const canViewAI = roleName === 'ADMIN' || roleName === 'ACCOUNTANT'

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return canViewDashboard ? <DashboardTab /> : <ProductsTab userRole={roleName} />
      case 'products':
        return canViewProducts ? <ProductsTab userRole={roleName} /> : null
      case 'imports':
        return canViewImportsExports ? <ImportsTab /> : <DashboardTab />
      case 'exports':
        return canViewImportsExports ? <ExportsTab /> : <DashboardTab />
      case 'reports':
        return canViewReports ? <ReportsTab /> : <DashboardTab />
      case 'ai':
        return canViewAI ? <AITab /> : <DashboardTab />
      default:
        return <DashboardTab />
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <strong>Warehouse AI</strong>
            <small>Quản lý kho</small>
          </div>
        </div>

        <nav className="nav">
          {canViewDashboard && (
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
          )}
          
          {canViewProducts && (
            <button 
              className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              Hàng hóa
            </button>
          )}
          
          {canViewImportsExports && (
            <>
              <button 
                className={`nav-item ${activeTab === 'imports' ? 'active' : ''}`}
                onClick={() => setActiveTab('imports')}
              >
                Nhập kho
              </button>
              <button 
                className={`nav-item ${activeTab === 'exports' ? 'active' : ''}`}
                onClick={() => setActiveTab('exports')}
              >
                Xuất kho
              </button>
            </>
          )}
          
          {canViewReports && (
            <button 
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              Báo cáo
            </button>
          )}
          
          {canViewAI && (
            <button 
              className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              AI Insights
            </button>
          )}
        </nav>

        <div className="user-box">
          <div className="avatar">{user?.full_name?.substring(0, 2).toUpperCase() || 'AD'}</div>
          <div style={{ flex: 1 }}>
            <strong>{user?.username || 'Admin'}</strong>
            <small>{user?.role?.name || 'admin@warehouse.ai'}</small>
          </div>
          <button 
            onClick={handleLogout}
            className="ghost-btn" 
            style={{ padding: '6px', minWidth: 'auto', title: 'Đăng xuất' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      <main className="main-panel">
        {renderContent()}
      </main>
    </div>
  )
}

export default App

