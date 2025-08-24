import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserManager from '../components/UserManager';
import TenantManager from '../components/TenantManager';
import HeatmapIntegration from '../components/HeatmapIntegration';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarCollapsed(false);
      } else {
        setSidebarCollapsed(true);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Different sidebar items based on user role
  const getSidebarItems = () => {
    if (user?.role === 'admin') {
      return [
        { id: 'overview', icon: '📊', label: 'Admin Overview', active: true },
        { id: 'users', icon: '👥', label: 'All Users' },
        { id: 'tenants', icon: '🏢', label: 'Tenant Management' },
        { id: 'heatmap-integration', icon: '🔥', label: 'Heatmap Integration' },
        { id: 'settings', icon: '⚙️', label: 'System Settings' },
        { id: 'support', icon: '🎧', label: 'Support' }
      ];
    } else if (user?.role === 'tenant') {
      return [
        { id: 'overview', icon: '📊', label: 'Store Overview', active: true },
        { id: 'users', icon: '👥', label: 'My Users' },
        { id: 'products', icon: '📦', label: 'Products' },
        { id: 'orders', icon: '🛒', label: 'Orders' },
        { id: 'settings', icon: '⚙️', label: 'Store Settings' }
      ];
    } else {
      return [
        { id: 'overview', icon: '📊', label: 'Dashboard', active: true },
        { id: 'profile', icon: '👤', label: 'Profile' },
        { id: 'settings', icon: '⚙️', label: 'Settings' }
      ];
    }
  };

  const sidebarItems = getSidebarItems();

  const renderOverview = () => {
    if (user?.role === 'admin') {
      return (
        <div className="dashboard-overview">
          <h2>Admin Dashboard Overview</h2>
          <div className="overview-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Total Users</h3>
                <p className="stat-number">1,247</p>
                <span className="stat-change positive">+12% this month</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏢</div>
              <div className="stat-content">
                <h3>Active Tenants</h3>
                <p className="stat-number">15</p>
                <span className="stat-change positive">+3 new</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>System Health</h3>
                <p className="stat-number">98.9%</p>
                <span className="stat-change neutral">Uptime</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Total Revenue</h3>
                <p className="stat-number">$12,450</p>
                <span className="stat-change positive">+18% this month</span>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (user?.role === 'tenant') {
      return (
        <div className="dashboard-overview">
          <h2>Welcome to {user?.storeName || 'Your Store'}</h2>
          <p className="store-domain">Domain: {user?.domainName}</p>
          <div className="overview-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Store Users</h3>
                <p className="stat-number">24</p>
                <span className="stat-change positive">+3 new</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>Products</h3>
                <p className="stat-number">156</p>
                <span className="stat-change positive">+8 added</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🛒</div>
              <div className="stat-content">
                <h3>Orders Today</h3>
                <p className="stat-number">43</p>
                <span className="stat-change positive">+12%</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Revenue</h3>
                <p className="stat-number">$3,250</p>
                <span className="stat-change positive">+22% this week</span>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="dashboard-overview">
          <h2>Welcome, {user?.name}</h2>
          <p>Your personal dashboard</p>
        </div>
      );
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      
      case 'users':
        return (
          <div className="management-section">
            <h2>👥 {user?.role === 'admin' ? 'All Users Management' : 'My Store Users'}</h2>
            <p className="section-description">
              {user?.role === 'admin' 
                ? 'Manage users across all tenants and handle user operations'
                : 'Manage users for your store'
              }
            </p>
            <UserManager tenantOnly={user?.role === 'tenant'} />
          </div>
        );
      
      case 'tenants':
        if (user?.role === 'admin') {
          return <TenantManager />;
        }
        return null;
      
      case 'products':
        if (user?.role === 'tenant') {
          return (
            <div className="products-section">
              <h2>📦 Product Management</h2>
              <p>Manage your store's products and inventory.</p>
              <div className="coming-soon">
                <p>Product management features coming soon...</p>
              </div>
            </div>
          );
        }
        return null;
      
      case 'orders':
        if (user?.role === 'tenant') {
          return (
            <div className="orders-section">
              <h2>🛒 Order Management</h2>
              <p>View and manage customer orders for your store.</p>
              <div className="coming-soon">
                <p>Order management features coming soon...</p>
              </div>
            </div>
          );
        }
        return null;
      
      case 'profile':
        return (
          <div className="profile-section">
            <h2>👤 My Profile</h2>
            <p>Manage your personal information and settings.</p>
            <div className="coming-soon">
              <p>Profile management features coming soon...</p>
            </div>
          </div>
        );
      
      case 'heatmap-integration':
        return <HeatmapIntegration />;
      
      case 'settings':
        return (
          <div className="settings-section">
            <h2>System Settings</h2>
            <p>Configuration and settings panel coming soon...</p>
          </div>
        );
      
      case 'support':
        return (
          <div className="support-section">
            <h2>Support Center</h2>
            <p>Help and support resources coming soon...</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            ☰
          </button>
          <div className="header-logo">
            <h1>VitalApp</h1>
          </div>
        </div>
        
        <div className="header-right">
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      {/* Dashboard Layout */}
      <div className="dashboard-layout">
        {/* Mobile Overlay */}
        <div 
          className={`sidebar-overlay ${!sidebarCollapsed ? 'show' : ''}`}
          onClick={() => setSidebarCollapsed(true)}
        ></div>
        
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : 'open'}`}>
          <nav className="sidebar-nav">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="sidebar-label">{item.label}</span>
                )}
              </button>
            ))}
          </nav>
          
          {!sidebarCollapsed && (
            <div className="sidebar-footer">
              <div className="sidebar-user">
                <div className="sidebar-user-avatar">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="User" />
                  ) : (
                    <div className="avatar-placeholder-small">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{user?.name}</span>
                  <span className="sidebar-user-role">{user?.role?.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;