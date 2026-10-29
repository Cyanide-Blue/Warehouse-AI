import { useState, useEffect } from 'react';
import './App.css';
import api from './services/api';
import Login from './Login';

// Import Tabs
import DashboardTab from './components/DashboardTab';
import ProductsTab from './components/ProductsTab';
import ImportsTab from './components/ImportsTab';
import ExportsTab from './components/ExportsTab';
import ReportsTab from './components/ReportsTab';
import AITab from './components/AITab';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const [isLoadingUser, setIsLoadingUser] = useState(!!localStorage.getItem('access_token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
    } else {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated]);

  const loadUser = async () => {
    try {
      setIsLoadingUser(true);
      const userData = await api.getCurrentUser();
      setUser(userData);
      
      // Default routing based on role
      const roleName = (userData?.role?.name || '').toUpperCase();
      if (roleName === 'STOREKEEPER' || roleName === 'STAFF') {
        setActiveTab('imports');
      } else if (roleName === 'ACCOUNTANT') {
        setActiveTab('reports');
      } else {
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error('Error loading user:', err);
      handleLogout();
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
    setIsLoadingUser(false);
  };

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <Login 
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          setIsLoadingUser(true);
        }} 
      />
    );
  }

  if (isLoadingUser) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#FFFDF5',
        color: '#111111',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid #EAE5D0',
          borderTopColor: '#111111',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '16px', color: '#57534E', fontSize: '13px' }}>Đang nạp dữ liệu hệ thống...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const roleName = (user?.role?.name || 'ADMIN').toUpperCase();
  const canViewDashboard = roleName === 'ADMIN' || roleName === 'ACCOUNTANT' || roleName === 'STOREKEEPER' || roleName === 'STAFF';
  const canViewProducts = true;
  const canViewImportsExports = roleName === 'ADMIN' || roleName === 'STOREKEEPER' || roleName === 'STAFF';
  const canViewReports = roleName === 'ADMIN' || roleName === 'ACCOUNTANT';
  const canViewAI = roleName === 'ADMIN' || roleName === 'ACCOUNTANT';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return canViewDashboard ? <DashboardTab onNavigateTab={handleNavClick} /> : <ProductsTab userRole={roleName} currentUser={user} onNavigateTab={handleNavClick} />;
      case 'products':
        return canViewProducts ? <ProductsTab userRole={roleName} currentUser={user} onNavigateTab={handleNavClick} /> : null;
      case 'imports':
        return canViewImportsExports ? <ImportsTab userRole={roleName} currentUser={user} /> : <DashboardTab onNavigateTab={handleNavClick} />;
      case 'exports':
        return canViewImportsExports ? <ExportsTab userRole={roleName} currentUser={user} /> : <DashboardTab onNavigateTab={handleNavClick} />;
      case 'reports':
        return canViewReports ? <ReportsTab /> : <DashboardTab onNavigateTab={handleNavClick} />;
      case 'ai':
        return canViewAI ? <AITab /> : <DashboardTab onNavigateTab={handleNavClick} />;
      default:
        return <DashboardTab onNavigateTab={handleNavClick} />;
    }
  };

  return (
    <div className="app-shell">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar (Fixed 232px, #111111) */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">W</div>
          <div className="brand-info">
            <span className="brand-name">Warehouse AI</span>
            <span className="brand-sub">Quản trị kho hàng</span>
          </div>
        </div>

        <nav className="nav" aria-label="Điều hướng chính">
          {canViewDashboard && (
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
              <span>Dashboard</span>
            </button>
          )}
          
          {canViewProducts && (
            <button 
              className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => handleNavClick('products')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                <path d="m3.3 7 8.7 5 8.7-5"/>
                <path d="M12 22V12"/>
              </svg>
              <span>Hàng hóa</span>
            </button>
          )}
          
          {canViewImportsExports && (
            <>
              <button 
                className={`nav-item ${activeTab === 'imports' ? 'active' : ''}`}
                onClick={() => handleNavClick('imports')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 17V3"/>
                  <path d="m6 11 6 6 6-6"/>
                  <path d="M19 21H5"/>
                </svg>
                <span>Nhập kho</span>
              </button>
              <button 
                className={`nav-item ${activeTab === 'exports' ? 'active' : ''}`}
                onClick={() => handleNavClick('exports')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="m18 13-6-6-6 6"/>
                  <path d="M12 7v14"/>
                  <path d="M5 3h14"/>
                </svg>
                <span>Xuất kho</span>
              </button>
            </>
          )}
          
          {canViewReports && (
            <button 
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => handleNavClick('reports')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 3v18h18"/>
                <path d="M18 17V9"/>
                <path d="M13 17V5"/>
                <path d="M8 17v-3"/>
              </svg>
              <span>Báo cáo</span>
            </button>
          )}
          
          {canViewAI && (
            <button 
              className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => handleNavClick('ai')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect width="16" height="16" x="4" y="4" rx="1"/>
                <rect width="6" height="6" x="9" y="9" rx="1"/>
                <path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/>
                <path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>
              </svg>
              <span>AI Insights</span>
            </button>
          )}
        </nav>

        {/* User footer */}
        <div className="user-box">
          <div className="avatar">
            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="user-meta">
            <span className="user-name">{user?.full_name || user?.username || 'Quản trị viên'}</span>
            <span className="user-role">{user?.role?.name || 'ADMIN'}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="logout-btn" 
            aria-label="Đăng xuất khỏi tài khoản"
            title="Đăng xuất"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-layout">
        {/* Mobile Header */}
        <div className="mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-mark" style={{ width: '24px', height: '24px', fontSize: '13px' }}>W</div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>Warehouse AI</strong>
          </div>
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Mở menu điều hướng"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>

        <main className="main-panel">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
