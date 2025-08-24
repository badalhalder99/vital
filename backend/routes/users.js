const express = require('express');
const { ObjectId } = require('mongodb');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Subscription = require('../models/Subscription');
const { requireTenant } = require('../middleware/tenant');
const { createTenantDatabase } = require('../config/database');
const router = express.Router();

// Get all tenants for frontend dropdown
router.get('/tenants', async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      sort: { created_at: 1 }
    });
    
    res.json({ success: true, data: tenants });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tenants' });
  }
});

// Create new tenant from frontend
router.post('/tenants', async (req, res) => {
  try {
    const { name, subdomain } = req.body;
    
    if (!name || !subdomain) {
      return res.status(400).json({
        success: false,
        message: 'Name and subdomain are required'
      });
    }

    // Check if subdomain is already taken
    const existingTenant = await Tenant.findBySubdomain(subdomain);
    
    if (existingTenant) {
      return res.status(409).json({
        success: false,
        message: 'Subdomain already exists'
      });
    }

    // Create tenant
    const tenant = new Tenant({
      name,
      subdomain,
      database_name: `tenant_${subdomain}`,
      status: 'active',
      settings: {
        created_by: 'frontend',
        onboarding_completed: false
      }
    });

    const tenantResult = await tenant.save();
    const tenantId = tenantResult.insertedId;

    // Create tenant database
    await createTenantDatabase(tenantId);

    // Create default subscription
    const subscriptionPlans = Subscription.getDefaultPlans();
    const planDetails = subscriptionPlans['free'];
    
    const subscription = new Subscription({
      tenant_id: tenantId,
      ...planDetails,
      billing_cycle: 'monthly',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    await subscription.save();

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: {
        tenant: tenant,
        subscription: subscription
      }
    });
  } catch (error) {
    console.error('Tenant creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tenant',
      error: error.message
    });
  }
});

// Update tenant
router.put('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const tenant = await Tenant.findById(id);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    const tenantInstance = Tenant.fromDocument(tenant);
    await tenantInstance.update(updateData);
    
    const updatedTenant = await Tenant.findById(id);
    
    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: updatedTenant
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant',
      error: error.message
    });
  }
});

// Delete tenant
router.delete('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tenant = await Tenant.findById(id);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    const tenantInstance = Tenant.fromDocument(tenant);
    await tenantInstance.delete();
    
    // Delete related data (users, etc.) from MongoDB
    try {
      const { getMongoDb } = require('../config/database');
      const db = getMongoDb();
      
      // Delete users belonging to this tenant
      await db.collection('users').deleteMany({ 
        $or: [
          { tenant_id: parseInt(id) },
          { tenant_id: id.toString() }
        ]
      });
      
      console.log(`Deleted users for tenant ${id}`);
    } catch (mongoError) {
      console.warn('Failed to delete MongoDB data for tenant:', mongoError.message);
    }
    
    res.json({
      success: true,
      message: 'Tenant deleted successfully',
      data: { deletedTenant: tenant }
    });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tenant',
      error: error.message
    });
  }
});

// Get all users - Multi-tenant aware with option to view all tenants
router.get('/', async (req, res) => {
  try {
    const { tenant_id, all_tenants } = req.query;
    
    const { getMongoDb } = require('../config/database');
    let db, collection;
    let query = {};
    
    if (all_tenants === 'true') {
      // Return users from all tenants (admin view)
      console.log('Fetching users from all tenants');
      db = getMongoDb(); // Use main database
      collection = db.collection('users');
    } else if (tenant_id) {
      const tenantIdNum = parseInt(tenant_id);
      
      if (tenantIdNum > 1) {
        // Use tenant-specific database for tenant users
        console.log('Fetching users from tenant-specific database for tenant:', tenantIdNum);
        try {
          db = getMongoDb(tenantIdNum); // Tenant-specific database
          collection = db.collection('users');
          console.log('Successfully connected to tenant database:', db.databaseName);
          // No need for query filter since we're already in tenant database
        } catch (tenantError) {
          console.error('Error accessing tenant database, falling back to main:', tenantError);
          // Fallback to main database with filter
          db = getMongoDb();
          collection = db.collection('users');
          console.log('Using main database fallback:', db.databaseName);
          query.$or = [
            { tenant_id: tenantIdNum },
            { tenant_id: tenant_id.toString() }
          ];
        }
      } else {
        // Use main database for default tenant (1)
        db = getMongoDb();
        collection = db.collection('users');
        query.$or = [
          { tenant_id: tenantIdNum },
          { tenant_id: tenant_id.toString() }
        ];
      }
      
      console.log('Fetching users for specific tenant ID:', tenant_id);
    } else {
      // Use tenant ID from middleware, fallback to 1 for backward compatibility
      const tenantId = req.tenantId || 1;
      db = getMongoDb();
      collection = db.collection('users');
      query.tenant_id = tenantId;
      console.log('Fetching users for tenant ID (default):', tenantId);
    }

    const users = await collection.find(query)
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
    
    console.log('Found users:', users.length);
    console.log('Database used:', db.databaseName);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Create new user - Multi-tenant aware with tenant selection
router.post('/', async (req, res) => {
  try {
    const { name, email, storeName, domainName, summary, tenant_id } = req.body;
    
    // Validation
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and email are required' 
      });
    }

    // Use tenant ID from request body, middleware, or fallback to 1
    const tenantId = tenant_id || req.tenantId || 1;
    console.log('Creating user for tenant ID:', tenantId);

    // Create user in both main database and tenant-specific database for proper multi-tenancy
    const { getMongoDb } = require('../config/database');
    
    const userData = {
      tenant_id: tenantId,
      name,
      email,
      storeName,
      domainName,
      summary,
      role: 'user',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    console.log('Creating user for tenant ID:', tenantId, 'with data:', JSON.stringify(userData));
    
    // 1. Create user in main database (for cross-tenant queries and frontend compatibility)
    const mainDb = getMongoDb(); // Main database
    const mainCollection = mainDb.collection('users');
    const mainResult = await mainCollection.insertOne(userData);
    console.log('User created in main database with ID:', mainResult.insertedId);
    
    // 2. Create user in tenant-specific database (for true multi-tenancy)
    let tenantResult = null;
    if (tenantId > 1) { // Only create in tenant DB if it's not the default tenant
      try {
        const tenantDb = getMongoDb(tenantId); // Tenant-specific database
        const tenantCollection = tenantDb.collection('users');
        tenantResult = await tenantCollection.insertOne({
          ...userData,
          _id: mainResult.insertedId // Use same ID for consistency
        });
        console.log('User also created in tenant database:', `tenant_${tenantId}`);
      } catch (tenantError) {
        console.error('Error creating user in tenant database:', tenantError);
        // Continue execution - main database creation succeeded
      }
    }
    
    const result = mainResult; // Use main result for response
    
    // Return user data
    const responseData = {
      _id: result.insertedId,
      ...userData
    };
    
    res.status(201).json({ success: true, data: responseData });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to create user' 
    });
  }
});

// Get single user - Multi-tenant aware
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { tenant_id } = req.query;
    const tenantId = tenant_id || req.tenantId || 1;
    
    const { getMongoDb } = require('../config/database');
    let collection;
    
    if (parseInt(tenantId) > 1) {
      // Use tenant-specific database
      const db = getMongoDb(parseInt(tenantId));
      collection = db.collection('users');
    } else {
      // Use main database
      const db = getMongoDb();
      collection = db.collection('users');
    }
    
    const { ObjectId } = require('mongodb');
    const user = await collection.findOne({ _id: new ObjectId(userId) });
    
    if (user) {
      // Remove password from response
      const { password, ...userData } = user;
      res.json({ success: true, data: userData });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// Update user - Multi-tenant aware
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, summary, tenant_id } = req.body;
    const tenantId = tenant_id || req.tenantId || 1;
    
    console.log('UPDATE REQUEST - User ID:', userId, 'Tenant ID:', tenantId);
    console.log('UPDATE REQUEST - Body:', req.body);
    
    const updateData = {
      name,
      email,
      summary,
      updated_at: new Date()
    };

    const { getMongoDb } = require('../config/database');
    let collection;
    
    if (parseInt(tenantId) > 1) {
      // Use tenant-specific database
      const db = getMongoDb(parseInt(tenantId));
      collection = db.collection('users');
      console.log('Updating user in tenant database:', db.databaseName);
    } else {
      // Use main database
      const db = getMongoDb();
      collection = db.collection('users');
      console.log('Updating user in main database');
    }
    
    const { ObjectId } = require('mongodb');
    const result = await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.modifiedCount > 0) {
      // Fetch updated user
      const updatedUser = await collection.findOne({ _id: new ObjectId(userId) });
      const { password, ...userData } = updatedUser;
      res.json({ success: true, data: userData });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to update user' 
    });
  }
});

// Test route to debug
router.all('/:id', (req, res, next) => {
  console.log('Route hit - Method:', req.method, 'ID:', req.params.id, 'Query:', req.query);
  next();
});

// Delete user - Multi-tenant aware
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { tenant_id } = req.query;
    const tenantId = tenant_id || req.tenantId || 1;
    
    console.log('DELETE REQUEST - User ID:', userId, 'Tenant ID:', tenantId);
    console.log('DELETE REQUEST - Query params:', req.query);
    
    // Validate ObjectId format
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format' 
      });
    }
    
    const { getMongoDb } = require('../config/database');
    let collection;
    
    if (parseInt(tenantId) > 1) {
      // Use tenant-specific database
      const db = getMongoDb(parseInt(tenantId));
      collection = db.collection('users');
      console.log('Deleting user from tenant database:', db.databaseName);
    } else {
      // Use main database
      const db = getMongoDb();
      collection = db.collection('users');
      console.log('Deleting user from main database');
    }
    
    const result = await collection.deleteOne({ _id: new ObjectId(userId) });
    
    if (result.deletedCount > 0) {
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete user' 
    });
  }
});

module.exports = router;