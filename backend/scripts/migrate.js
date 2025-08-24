#!/usr/bin/env node

const { connectToMongoDB, closeDatabaseConnections, getMongoDb } = require('../config/database');

class MongoMigration {
  constructor() {
    this.db = null;
  }

  async connect() {
    await connectToMongoDB();
    this.db = getMongoDb();
  }

  async createIndexes() {
    console.log('📊 Creating MongoDB indexes...');
    
    try {
      // Users collection indexes
      console.log('  Creating indexes for users collection...');
      await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
      await this.db.collection('users').createIndex({ tenant_id: 1 });
      await this.db.collection('users').createIndex({ role: 1 });
      await this.db.collection('users').createIndex({ status: 1 });
      await this.db.collection('users').createIndex({ google_id: 1 }, { sparse: true });
      await this.db.collection('users').createIndex({ created_at: -1 });

      // Tenants collection indexes
      console.log('  Creating indexes for tenants collection...');
      await this.db.collection('tenants').createIndex({ subdomain: 1 }, { unique: true });
      await this.db.collection('tenants').createIndex({ status: 1 });
      await this.db.collection('tenants').createIndex({ created_at: -1 });

      // Subscriptions collection indexes
      console.log('  Creating indexes for subscriptions collection...');
      await this.db.collection('subscriptions').createIndex({ tenant_id: 1 });
      await this.db.collection('subscriptions').createIndex({ status: 1 });
      await this.db.collection('subscriptions').createIndex({ plan_type: 1 });
      await this.db.collection('subscriptions').createIndex({ current_period_end: 1 });
      await this.db.collection('subscriptions').createIndex({ created_at: -1 });

      // Analytics collection indexes
      console.log('  Creating indexes for analytics collection...');
      await this.db.collection('analytics').createIndex({ tenant_id: 1 });
      await this.db.collection('analytics').createIndex({ session_id: 1 });
      await this.db.collection('analytics').createIndex({ user_id: 1 });
      await this.db.collection('analytics').createIndex({ event_type: 1 });
      await this.db.collection('analytics').createIndex({ page: 1 });
      await this.db.collection('analytics').createIndex({ timestamp: -1 });
      await this.db.collection('analytics').createIndex({ 
        tenant_id: 1, 
        event_type: 1, 
        timestamp: -1 
      });

      console.log('✅ All indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }

  async createCollections() {
    console.log('📦 Creating MongoDB collections...');
    
    try {
      const collections = ['users', 'tenants', 'subscriptions', 'analytics'];
      
      for (const collectionName of collections) {
        try {
          await this.db.createCollection(collectionName);
          console.log(`  ✅ Created collection: ${collectionName}`);
        } catch (error) {
          if (error.code === 48) {
            console.log(`  ⚠️  Collection ${collectionName} already exists`);
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error creating collections:', error);
      throw error;
    }
  }

  async checkMigrationStatus() {
    console.log('🔍 Checking migration status...');
    
    try {
      const collections = await this.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      console.log('📋 Existing collections:');
      collectionNames.forEach(name => {
        console.log(`  - ${name}`);
      });
      
      return collections;
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      throw error;
    }
  }

  async runMigrations() {
    console.log('🚀 Running MongoDB migrations...');
    
    try {
      await this.connect();
      await this.checkMigrationStatus();
      await this.createCollections();
      await this.createIndexes();
      
      console.log('🎉 MongoDB migrations completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'up';
  
  try {
    const migration = new MongoMigration();
    
    switch (command) {
      case 'up':
        await migration.runMigrations();
        break;
      case 'status':
        await migration.connect();
        await migration.checkMigrationStatus();
        break;
      default:
        console.log('Usage: node migrate.js [up|status]');
        console.log('  up     - Run all migrations');
        console.log('  status - Check migration status');
        break;
    }
  } catch (error) {
    console.error('❌ Migration script failed:', error);
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

module.exports = { MongoMigration };