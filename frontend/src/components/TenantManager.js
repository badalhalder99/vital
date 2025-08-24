import React, { useState, useEffect } from 'react';
import { tenantAPI } from '../services/api';

const TenantManager = () => {
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [newTenant, setNewTenant] = useState({ 
    name: '', 
    subdomain: '',
    plan: 'basic',
    status: 'active'
  });
  const [tenantStats, setTenantStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalUsers: 0
  });

  // Fetch tenants and calculate stats
  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await tenantAPI.getTenants();
      console.log('Tenants response:', response);

      if (response && response.success) {
        setTenants(response.data);
        
        // Calculate stats
        const stats = {
          total: response.data.length,
          active: response.data.filter(t => t.status === 'active' || !t.status).length,
          inactive: response.data.filter(t => t.status === 'inactive').length,
          totalUsers: 0 // Will be calculated from users
        };
        setTenantStats(stats);
      } else {
        setError('Failed to fetch tenants');
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users to get user counts per tenant
  const fetchAllUsers = async () => {
    try {
      const response = await tenantAPI.getUsers({ all_tenants: true });
      if (response && response.success) {
        setUsers(response.data);
        
        // Update total users in stats
        setTenantStats(prev => ({
          ...prev,
          totalUsers: response.data.length
        }));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Get user count for a specific tenant
  const getUserCountForTenant = (tenantId) => {
    return users.filter(user => user.tenant_id === tenantId).length;
  };

  // Create new tenant
  const createTenant = async (e) => {
    e.preventDefault();
    if (!newTenant.name || !newTenant.subdomain) {
      setError('Tenant name and subdomain are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await tenantAPI.createTenant(newTenant);
      
      if (response.success) {
        setNewTenant({ name: '', subdomain: '', plan: 'basic', status: 'active' });
        setShowCreateForm(false);
        await fetchTenants(); // Refresh the list
        setError(`✅ Tenant "${response.data.tenant.name}" created successfully!`);
        
        setTimeout(() => setError(''), 3000);
      } else {
        setError('Failed to create tenant');
      }
    } catch (err) {
      setError('Error creating tenant: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete tenant
  const deleteTenant = async (tenantId, tenantName) => {
    if (!window.confirm(`Are you sure you want to delete "${tenantName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      // Note: You may need to implement this endpoint in your backend
      const response = await tenantAPI.deleteTenant(tenantId);
      
      if (response.success) {
        await fetchTenants(); // Refresh the list
        setError(`✅ Tenant "${tenantName}" deleted successfully!`);
        setTimeout(() => setError(''), 3000);
      } else {
        setError('Failed to delete tenant');
      }
    } catch (err) {
      setError('Error deleting tenant: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Toggle tenant status
  const toggleTenantStatus = async (tenantId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    setLoading(true);
    try {
      const response = await tenantAPI.updateTenant(tenantId, { status: newStatus });
      
      if (response.success) {
        await fetchTenants(); // Refresh the list
        setError(`✅ Tenant status updated to ${newStatus}!`);
        setTimeout(() => setError(''), 3000);
      } else {
        setError('Failed to update tenant status');
      }
    } catch (err) {
      setError('Error updating tenant: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Start editing a tenant
  const startEditTenant = (tenant) => {
    setEditingTenant({
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      plan: tenant.plan || 'basic',
      status: tenant.status || 'active'
    });
    setShowEditForm(true);
  };

  // Cancel editing
  const cancelEditTenant = () => {
    setEditingTenant(null);
    setShowEditForm(false);
  };

  // Update tenant
  const updateTenant = async (e) => {
    e.preventDefault();
    if (!editingTenant.name || !editingTenant.subdomain) {
      setError('Tenant name and subdomain are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await tenantAPI.updateTenant(editingTenant.id, {
        name: editingTenant.name,
        subdomain: editingTenant.subdomain,
        plan: editingTenant.plan,
        status: editingTenant.status
      });
      
      if (response.success) {
        setEditingTenant(null);
        setShowEditForm(false);
        await fetchTenants(); // Refresh the list
        setError(`✅ Tenant "${response.data.name}" updated successfully!`);
        
        setTimeout(() => setError(''), 3000);
      } else {
        setError('Failed to update tenant');
      }
    } catch (err) {
      setError('Error updating tenant: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Get storage usage (mock data for now)
  const getStorageUsage = (tenantId) => {
    // This would come from your backend API
    const mockUsage = {
      1: { used: 2.4, total: 10, percentage: 24 },
      2: { used: 1.8, total: 5, percentage: 36 },
      3: { used: 0.5, total: 1, percentage: 50 }
    };
    return mockUsage[tenantId] || { used: 0, total: 1, percentage: 0 };
  };

  // Get plan display name
  const getPlanDisplay = (plan) => {
    const plans = {
      'basic': 'Basic',
      'pro': 'Pro', 
      'enterprise': 'Enterprise'
    };
    return plans[plan] || 'Basic';
  };

  useEffect(() => {
    fetchTenants();
    fetchAllUsers();
  }, []);

  return (
    <div className="tenant-management-section">
      <div className="tenant-header">
        <div>
          <h2>🏢 Tenant Management</h2>
          <p className="section-description">
            Manage your tenants, create new organizations, and configure tenant settings
          </p>
        </div>
        <button 
          className="btn-primary create-tenant-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <span>➕</span>
          Create New Tenant
        </button>
      </div>

      {/* Create Tenant Form */}
      {showCreateForm && (
        <div className="create-tenant-form">
          <h3>Create New Tenant</h3>
          <form onSubmit={createTenant}>
            <div className="form-grid-tenant">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Tenant Name *"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Subdomain *"
                  value={newTenant.subdomain}
                  onChange={(e) => setNewTenant({ 
                    ...newTenant, 
                    subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') 
                  })}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <select
                  value={newTenant.plan}
                  onChange={(e) => setNewTenant({ ...newTenant, plan: e.target.value })}
                  className="form-input"
                >
                  <option value="basic">Basic Plan</option>
                  <option value="pro">Pro Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </select>
              </div>
            </div>
            <div className="form-buttons">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating...' : 'Create Tenant'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {showEditForm && editingTenant && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Tenant</h3>
              <button 
                className="modal-close"
                onClick={cancelEditTenant}
              >
                ×
              </button>
            </div>
            <form onSubmit={updateTenant}>
              <div className="form-grid-tenant">
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Tenant Name *"
                    value={editingTenant.name}
                    onChange={(e) => setEditingTenant({ 
                      ...editingTenant, 
                      name: e.target.value 
                    })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Subdomain *"
                    value={editingTenant.subdomain}
                    onChange={(e) => setEditingTenant({ 
                      ...editingTenant, 
                      subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') 
                    })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <select
                    value={editingTenant.plan}
                    onChange={(e) => setEditingTenant({ 
                      ...editingTenant, 
                      plan: e.target.value 
                    })}
                    className="form-input"
                  >
                    <option value="basic">Basic Plan</option>
                    <option value="pro">Pro Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                  </select>
                </div>
                <div className="form-group">
                  <select
                    value={editingTenant.status}
                    onChange={(e) => setEditingTenant({ 
                      ...editingTenant, 
                      status: e.target.value 
                    })}
                    className="form-input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-buttons">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Updating...' : 'Update Tenant'}
                </button>
                <button 
                  type="button" 
                  onClick={cancelEditTenant}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className={`message ${error.startsWith('✅') ? 'success-message' : 'error-message'}`}>
          {error}
        </div>
      )}

      {/* Tenant Statistics */}
      <div className="tenant-stats">
        <div className="stat-card-small">
          <div className="stat-icon-small">🏢</div>
          <div className="stat-content-small">
            <h4>Total Tenants</h4>
            <span className="stat-number-small">{tenantStats.total}</span>
          </div>
        </div>
        <div className="stat-card-small">
          <div className="stat-icon-small">✅</div>
          <div className="stat-content-small">
            <h4>Active</h4>
            <span className="stat-number-small">{tenantStats.active}</span>
          </div>
        </div>
        <div className="stat-card-small">
          <div className="stat-icon-small">⏸️</div>
          <div className="stat-content-small">
            <h4>Inactive</h4>
            <span className="stat-number-small">{tenantStats.inactive}</span>
          </div>
        </div>
        <div className="stat-card-small">
          <div className="stat-icon-small">👥</div>
          <div className="stat-content-small">
            <h4>Total Users</h4>
            <span className="stat-number-small">{tenantStats.totalUsers}</span>
          </div>
        </div>
      </div>

      {/* Tenants Grid */}
      {loading && tenants.length === 0 ? (
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>Loading tenants...</p>
        </div>
      ) : (
        <div className="tenant-grid">
          {tenants.map((tenant) => {
            const userCount = getUserCountForTenant(tenant.id);
            const storage = getStorageUsage(tenant.id);
            const status = tenant.status || 'active';
            
            return (
              <div key={tenant.id} className="tenant-card">
                <div className="tenant-card-header">
                  <div className="tenant-info">
                    <h3>{tenant.name}</h3>
                    <span className="tenant-id">ID: TNT-{String(tenant.id).padStart(3, '0')}</span>
                  </div>
                  <div className={`tenant-status ${status}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                </div>
                
                <div className="tenant-card-body">
                  <div className="tenant-details">
                    <div className="detail-item">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">
                        {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Users:</span>
                      <span className="detail-value">{userCount} users</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Plan:</span>
                      <span className="detail-value">{getPlanDisplay(tenant.plan || 'basic')}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Storage:</span>
                      <span className="detail-value">
                        {storage.used} GB / {storage.total} GB
                      </span>
                    </div>
                  </div>
                  
                  <div className="tenant-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${storage.percentage}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="tenant-card-actions">
                  <button 
                    className="btn-secondary" 
                    onClick={() => startEditTenant(tenant)}
                    disabled={loading}
                    title="Edit Tenant"
                  >
                    ✏️ Edit
                  </button>
                  {status === 'active' ? (
                    <button 
                      className="btn-danger"
                      onClick={() => toggleTenantStatus(tenant.id, status)}
                      disabled={loading}
                      title="Deactivate Tenant"
                    >
                      ⏸️ Deactivate
                    </button>
                  ) : (
                    <button 
                      className="btn-success"
                      onClick={() => toggleTenantStatus(tenant.id, status)}
                      disabled={loading}
                      title="Activate Tenant"
                    >
                      ▶️ Activate
                    </button>
                  )}
                  <button 
                    className="btn-danger"
                    onClick={() => deleteTenant(tenant.id, tenant.name)}
                    disabled={loading}
                    title="Delete Tenant"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
          
          {tenants.length === 0 && !loading && (
            <div className="no-tenants-state">
              <div className="empty-icon">🏢</div>
              <h4>No tenants found</h4>
              <p>Start by creating your first tenant using the "Create New Tenant" button above.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TenantManager;