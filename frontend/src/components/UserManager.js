import React, { useState, useEffect } from 'react';
import api, { tenantAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const UserManager = ({ tenantOnly = false }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [viewMode, setViewMode] = useState(tenantOnly ? 'single' : 'single'); // 'single', 'all'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({
    id: '',
    name: '',
    email: '',
    summary: '',
    tenant_id: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: '', subdomain: '' });

  const fetchTenants = async () => {
    try {
      console.log('Fetching tenants...'); // Debug log
      const response = await tenantAPI.getTenants();
      console.log('Tenants fetch response:', response); // Debug log

      if (response && response.success) {
        console.log('Setting tenants:', response.data.length, 'tenants'); // Debug log
        setTenants(response.data);
        // Set default tenant based on mode
        if (!selectedTenant && response.data.length > 0) {
          if (tenantOnly && currentUser?.tenant_id) {
            // For tenant-only mode, use current user's tenant
            setSelectedTenant(currentUser.tenant_id.toString());
            console.log('Set tenant to current user tenant:', currentUser.tenant_id);
          } else {
            setSelectedTenant(response.data[0].id.toString());
            console.log('Set default tenant to:', response.data[0].id);
          }
        }
      } else {
        console.error('Failed to fetch tenants:', response);
        setError('Failed to load tenants. Please refresh the page.');
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError('Error connecting to server. Please check your connection.');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const options = {};

      if (tenantOnly && currentUser?.tenant_id) {
        // For tenant-only mode, always filter by current user's tenant
        options.tenant_id = currentUser.tenant_id;
        console.log('Fetching users for tenant-only mode. Current user:', currentUser);
        console.log('Using tenant_id:', currentUser.tenant_id);
      } else if (viewMode === 'all') {
        options.all_tenants = true;
      } else if (selectedTenant) {
        options.tenant_id = selectedTenant;
      }

      const response = await tenantAPI.getUsers(options);

      if (response && response.success) {
        setUsers(response.data);
        console.log('Loaded users:', response.data.length); // Debug log
      } else {
        setError('Failed to fetch users');
        console.error('Users fetch failed:', response);
      }
    } catch (err) {
      setError('Error connecting to server: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      setError('Name and email are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Use selected tenant or the form's tenant selection
      const userData = {
        ...newUser,
        tenant_id: tenantOnly && currentUser?.tenant_id 
          ? currentUser.tenant_id 
          : (newUser.tenant_id || selectedTenant)
      };
      console.log(userData)
      const response = await tenantAPI.createUser(userData);
      console.log(response)
      if (response.success) {
        // Reset form first
        setNewUser({ id: '', name: '', email: '', summary: '', tenant_id: '' });

        // If user was created for a different tenant than currently viewing, switch to show all or that specific tenant
        const createdUserTenantId = userData.tenant_id || selectedTenant;

        if (viewMode === 'single' && selectedTenant !== createdUserTenantId.toString()) {
          // Switch to the tenant where user was created
          setSelectedTenant(createdUserTenantId.toString());
        }

        // Refresh users list to show updated data
        await fetchUsers();

        // Show success message
        const tenantName = tenants.find(t => t.id.toString() === createdUserTenantId.toString())?.name || 'Unknown Tenant';
        setError(`✅ User "${response.data.name}" successfully added to ${tenantName}!`);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setError('');
        }, 3000);
      } else {
        setError('Failed to add user');
      }
    } catch (err) {
      setError('Error adding user: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const addTenant = async (e) => {
    e.preventDefault();
    if (!newTenant.name || !newTenant.subdomain) {
      setError('Tenant name and subdomain are required');
      return;
    }

    setLoading(true);
    setError('');
    console.log('Creating tenant:', newTenant); // Debug log

    try {
      const response = await tenantAPI.createTenant(newTenant);
      console.log('Tenant creation response:', response); // Debug log

      if (response.success) {
        // Refresh tenants list
        console.log('Refreshing tenants list...'); // Debug log
        await fetchTenants();
        setNewTenant({ name: '', subdomain: '' });
        setShowTenantForm(false);
        setError(`✅ Tenant "${response.data.tenant.name}" successfully created with ID ${response.data.tenant.id}!`);

        // Clear success message after 5 seconds (extended for testing)
        setTimeout(() => {
          setError('');
        }, 5000);
      } else {
        console.error('Tenant creation failed:', response); // Debug log
        setError('Failed to create tenant: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Tenant creation error:', err); // Debug log
      setError('Error creating tenant: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user) => {
    setEditingUser({ ...user });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setIsEditing(false);
  };

  const updateUser = async (e) => {
    e.preventDefault();
    if (!editingUser.name || !editingUser.email) {
      setError('Name and email are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const tenantId = tenantOnly && currentUser?.tenant_id ? currentUser.tenant_id : selectedTenant;
      const updateData = {
        ...editingUser,
        tenant_id: tenantId
      };
      const response = await api.put(`/api/users/${editingUser._id}`, updateData);

      if (response.data.success) {
        setUsers(users.map(user => user._id === editingUser._id ? response.data.data : user));
        setEditingUser(null);
        setIsEditing(false);
      } else {
        setError('Failed to update user');
      }
    } catch (err) {
      setError('Error updating user: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const tenantId = tenantOnly && currentUser?.tenant_id ? currentUser.tenant_id : selectedTenant;
      console.log('Deleting user:', userId, 'for tenant:', tenantId);
      console.log('Delete URL:', `/api/users/${userId}?tenant_id=${tenantId}`);
      
      const response = await api.delete(`/api/users/${userId}?tenant_id=${tenantId}`);
      console.log('Delete response:', response);

      if (response.data.success) {
        setUsers(users.filter(user => user._id !== userId));
        setError('✅ User deleted successfully!');
        setTimeout(() => setError(''), 3000);
      } else {
        setError('Failed to delete user');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Error deleting user: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Initialize tenant selection for tenant-only mode
  useEffect(() => {
    if (tenantOnly && currentUser?.tenant_id && !selectedTenant) {
      setSelectedTenant(currentUser.tenant_id.toString());
    }
  }, [tenantOnly, currentUser, selectedTenant]);

  useEffect(() => {
    if (!tenantOnly) {
      fetchTenants();
    } else {
      // For tenant-only mode, create a minimal tenant list with current user's tenant
      if (currentUser?.tenant_id) {
        setTenants([{
          id: currentUser.tenant_id,
          name: currentUser.storeName || 'My Store',
          subdomain: currentUser.domainName || 'store'
        }]);
        setSelectedTenant(currentUser.tenant_id.toString());
      }
    }
  }, [tenantOnly, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if ((tenantOnly && currentUser?.tenant_id) || (!tenantOnly && tenants.length > 0)) {
      fetchUsers();
    }
  }, [selectedTenant, viewMode, tenants, tenantOnly, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="user-manager">
      {/* Tenant Management Section - Only show for admin */}
      {!tenantOnly && (
        <section className="tenant-section">
          <div className="section-header">
            <h3>🏢 Multi-Tenant Management</h3>
            <button
              onClick={() => setShowTenantForm(!showTenantForm)}
              className="btn btn-secondary"
            >
              {showTenantForm ? 'Cancel' : 'Add Tenant'}
            </button>
          </div>

          {/* Tenant Creation Form */}
          {showTenantForm && (
            <form onSubmit={addTenant} className="tenant-form">
              <div className="form-grid">
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
                    onChange={(e) => setNewTenant({ ...newTenant, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Creating...' : 'Create Tenant'}
              </button>
            </form>
          )}

          {/* Tenant & View Selection */}
          <div className="tenant-controls">
            <div className="control-group">
              <label>View Mode:</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="form-input"
              >
                <option value="single">Single Tenant</option>
                <option value="all">All Tenants</option>
              </select>
            </div>

            {viewMode === 'single' && (
              <div className="control-group">
                <label>Select Tenant:</label>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="form-input"
                >
                  <option value="">Choose tenant...</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.subdomain})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Add/Edit User Form */}
      <section className="add-user-section">
        <h3>
          {isEditing ? '✏️ Edit User' : '➕ Add New User'}
        </h3>
        <form onSubmit={isEditing ? updateUser : addUser} className="user-form">
          <div className='form-grid'>
            <div className='form-column'>
              <div className="form-group">
                <input
                  type="number"
                  placeholder="ID (optional)"
                  value={isEditing ? editingUser.id || '' : newUser.id}
                  onChange={(e) => isEditing
                    ? setEditingUser({ ...editingUser, id: e.target.value })
                    : setNewUser({ ...newUser, id: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Name *"
                  value={isEditing ? editingUser.name : newUser.name}
                  onChange={(e) => isEditing
                    ? setEditingUser({ ...editingUser, name: e.target.value })
                    : setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  placeholder="Summary"
                  value={isEditing ? editingUser.summary || '' : newUser.summary}
                  onChange={(e) => isEditing
                    ? setEditingUser({ ...editingUser, summary: e.target.value })
                    : setNewUser({ ...newUser, summary: e.target.value })
                  }
                  className="form-input"
                  rows="2"
                />
              </div>
              {!isEditing && !tenantOnly && (
                <div className="form-group">
                  <select
                    value={newUser.tenant_id}
                    onChange={(e) => setNewUser({ ...newUser, tenant_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Select Tenant for User...</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.subdomain})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {tenantOnly && currentUser?.storeName && (
                <div className="form-group">
                  <input
                    type="text"
                    value={`Adding to: ${currentUser.storeName}`}
                    className="form-input"
                    disabled
                    style={{ backgroundColor: '#f5f5f5', color: '#666' }}
                  />
                </div>
              )}
            </div>

            <div className='form-column'>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email *"
                  value={isEditing ? editingUser.email : newUser.email}
                  onChange={(e) => isEditing
                    ? setEditingUser({ ...editingUser, email: e.target.value })
                    : setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="form-input"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-buttons">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update User' : 'Add User')}
            </button>
            {isEditing && (
              <button type="button" onClick={cancelEdit} className="btn btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Error/Success Display */}
      {error && (
        <div className={`message ${error.startsWith('✅') ? 'success-message' : 'error-message'}`}>
          {error}
        </div>
      )}

      {/* Users List */}
      <section className="users-section">
        <div className="section-header">
          <h3>
            👥 {tenantOnly ? 'Store Users' : 'Users List'}
            {!tenantOnly && viewMode === 'all' && <span className="view-mode-badge all-tenants">All Tenants</span>}
            {!tenantOnly && viewMode === 'single' && selectedTenant && (
              <span className="view-mode-badge single-tenant">
                {tenants.find(t => t.id.toString() === selectedTenant)?.name || 'Single Tenant'}
              </span>
            )}
            {tenantOnly && currentUser?.storeName && (
              <span className="view-mode-badge single-tenant">
                {currentUser.storeName}
              </span>
            )}
            <span className="user-count">({users.length})</span>
          </h3>
          <button onClick={fetchUsers} disabled={loading} className="btn btn-secondary">
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {loading && users.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <p>Loading users...</p>
          </div>
        ) : (
          <div className="users-grid">
            {users.map((user) => (
              <div key={user._id} className="user-card modern">
                <div className="card-header">
                  <div className="user-avatar-small">
                    {user.avatar ? (
                      <img src={user.avatar} alt="User Avatar" />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.name?.charAt(0).toUpperCase() || '👤'}
                      </div>
                    )}
                  </div>
                  <div className="user-basic-info">
                    <h4>{user.name}</h4>
                    <p className="user-email">✉️ {user.email}</p>
                  </div>
                  {user.tenant_id && (
                    <div className="tenant-badge">
                      {tenants.find(t => t.id === user.tenant_id)?.name || `T${user.tenant_id}`}
                    </div>
                  )}
                </div>

                <div className="card-content">
                  <div className="user-details">
                    {user.summary && (
                      <div className="detail-item summary">
                        <span className="detail-icon">📝</span>
                        <span className="detail-text">{user.summary}</span>
                      </div>
                    )}
                    {user.role && (
                      <div className="detail-item">
                        <span className="detail-icon">👤</span>
                        <span className="detail-text">Role: {user.role}</span>
                      </div>
                    )}
                    {user.created_at && (
                      <div className="detail-item">
                        <span className="detail-icon">📅</span>
                        <span className="detail-text">Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    onClick={() => startEdit(user)}
                    className="btn btn-edit btn-sm"
                    disabled={loading}
                    title="Edit User"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteUser(user._id)}
                    className="btn btn-delete btn-sm"
                    disabled={loading}
                    title="Delete User"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && !loading && (
              <div className="no-users-state">
                <div className="empty-icon">👤</div>
                <h4>No users found</h4>
                <p>
                  {tenantOnly
                    ? 'No users in your store yet. Create your first store user above.'
                    : viewMode === 'single'
                    ? 'No users in the selected tenant. Try creating a new user or selecting a different tenant.'
                    : 'No users found in any tenant. Start by creating your first user above.'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default UserManager;