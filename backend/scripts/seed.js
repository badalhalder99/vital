#!/usr/bin/env node

const { connectToMongoDB, closeDatabaseConnections } = require('../config/database');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Subscription = require('../models/Subscription');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await connectToMongoDB();
    console.log('✅ Connected to MongoDB');

    // Seed tenants
    console.log('📦 Seeding tenants...');
    const tenants = [
      {
        name: 'Default Tenant',
        subdomain: 'default',
        database_name: 'tenant_default',
        status: 'active',
        settings: {
          created_by: 'seed',
          onboarding_completed: true
        }
      },
      {
        name: 'Demo Store',
        subdomain: 'demo',
        database_name: 'tenant_demo',
        status: 'active',
        settings: {
          created_by: 'seed',
          onboarding_completed: true
        }
      },
      {
        name: 'Acme Corporation',
        subdomain: 'acme',
        database_name: 'tenant_acme',
        status: 'active',
        settings: {
          created_by: 'seed',
          onboarding_completed: true
        }
      }
    ];

    const createdTenants = [];
    for (const tenantData of tenants) {
      const tenant = new Tenant(tenantData);
      const result = await tenant.save();
      createdTenants.push({ ...tenantData, _id: result.insertedId });
      console.log(`  ✅ Created tenant: ${tenantData.name}`);
    }

    // Seed subscriptions for tenants
    console.log('💳 Seeding subscriptions...');
    const plans = Subscription.getDefaultPlans();
    
    for (let i = 0; i < createdTenants.length; i++) {
      const tenant = createdTenants[i];
      const tenantId = i + 1; // Use simple numeric ID (1, 2, 3)
      const planType = i === 0 ? 'premium' : i === 1 ? 'basic' : 'free';
      const planDetails = plans[planType];
      
      const subscription = new Subscription({
        tenant_id: tenantId,
        ...planDetails,
        billing_cycle: 'monthly',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
      
      await subscription.save();
      console.log(`  ✅ Created ${planType} subscription for tenant: ${tenant.name}`);
    }

    // Seed users
    console.log('👥 Seeding users...');
    const users = [
      {
        tenant_id: 1, // Default tenant
        name: 'Admin User',
        email: 'admin@example.com',
        password: await User.hashPassword('admin123'),
        role: 'admin',
        status: 'active',
        email_verified: true
      },
      {
        tenant_id: 1, // Default tenant  
        name: 'Demo Tenant',
        email: 'tenant@demo.com',
        password: await User.hashPassword('tenant123'),
        storeName: 'Demo Store',
        domainName: 'demo-store',
        role: 'tenant',
        status: 'active',
        email_verified: true
      },
      {
        tenant_id: 1, // Default tenant
        name: 'John Doe',
        email: 'john@example.com',
        password: await User.hashPassword('user123'),
        role: 'user',
        status: 'active',
        email_verified: true
      },
      {
        tenant_id: 2, // Demo tenant
        name: 'Jane Smith',
        email: 'jane@demo.com',
        password: await User.hashPassword('user123'),
        role: 'user',
        status: 'active',
        email_verified: true
      },
      {
        tenant_id: 3, // Acme tenant
        name: 'Bob Wilson',
        email: 'bob@acme.com',
        password: await User.hashPassword('user123'),
        role: 'user',
        status: 'active',
        email_verified: true
      }
    ];

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`  ✅ Created user: ${userData.name} (${userData.role})`);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Seeded data summary:');
    console.log(`  - Tenants: ${tenants.length}`);
    console.log(`  - Subscriptions: ${createdTenants.length}`);
    console.log(`  - Users: ${users.length}`);
    
    console.log('\n🔐 Default login credentials:');
    console.log('  Admin: admin@example.com / admin123');
    console.log('  Tenant: tenant@demo.com / tenant123');
    console.log('  User: john@example.com / user123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

async function clearDatabase() {
  try {
    console.log('🧹 Clearing existing data...');
    
    await connectToMongoDB();
    const { getMongoDb } = require('../config/database');
    const db = getMongoDb();
    
    // Clear collections
    await db.collection('users').deleteMany({});
    await db.collection('tenants').deleteMany({});
    await db.collection('subscriptions').deleteMany({});
    await db.collection('analytics').deleteMany({});
    
    console.log('✅ Database cleared');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear') || args.includes('-c');
  
  try {
    if (shouldClear) {
      await clearDatabase();
    }
    
    await seedDatabase();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnections();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedDatabase, clearDatabase };