const { MongoClient } = require('mongodb');

async function checkTenant13Data() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Check main database for tenant_id 13 users
    const mainDb = client.db('multi_tenant_saas');
    const mainCollection = mainDb.collection('users');
    
    console.log('\n=== Checking MAIN DATABASE ===');
    
    // Check different formats of tenant_id 13
    const queries = [
      { tenant_id: 13 },          // Number
      { tenant_id: "13" },        // String
      { tenant_id: { $eq: 13 } }, // Explicit number query
      { tenant_id: { $eq: "13" } } // Explicit string query
    ];
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const users = await mainCollection.find(query).toArray();
      console.log(`Query ${i + 1} (${JSON.stringify(query)}):`, users.length, 'users found');
      if (users.length > 0) {
        console.log('Sample user:', users[0]);
      }
    }
    
    // Check tenant-specific database
    console.log('\n=== Checking TENANT-SPECIFIC DATABASE (tenant_13) ===');
    const tenantDb = client.db('tenant_13');
    const tenantCollection = tenantDb.collection('users');
    const tenantUsers = await tenantCollection.find({}).toArray();
    console.log('Tenant database users count:', tenantUsers.length);
    if (tenantUsers.length > 0) {
      console.log('Sample tenant user:', tenantUsers[0]);
    }
    
    // Check all users with their tenant_id types
    console.log('\n=== Analyzing ALL USERS tenant_id TYPES ===');
    const allUsers = await mainCollection.find({}).toArray();
    const tenantIdTypes = {};
    allUsers.forEach(user => {
      const type = typeof user.tenant_id;
      const value = user.tenant_id;
      const key = `${type}:${value}`;
      if (!tenantIdTypes[key]) {
        tenantIdTypes[key] = 0;
      }
      tenantIdTypes[key]++;
    });
    
    console.log('Tenant ID distribution by type:');
    Object.entries(tenantIdTypes).forEach(([key, count]) => {
      console.log(`  ${key}: ${count} users`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkTenant13Data();