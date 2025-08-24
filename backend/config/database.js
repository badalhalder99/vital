const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const MONGODB_NAME = 'multi_tenant_saas';

let mongoClient;
let mongoDb;
let tenantDatabases = new Map();

// MongoDB Connection
async function connectToMongoDB() {
  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    mongoDb = mongoClient.db(MONGODB_NAME);
    return mongoDb;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Get MongoDB instance
function getMongoDb(tenantId = null) {
  if (!mongoClient) {
    throw new Error('MongoDB not initialized. Call connectToMongoDB first.');
  }
  
  if (tenantId) {
    return mongoClient.db(`tenant_${tenantId}`);
  }
  
  return mongoDb;
}

// Initialize database
async function initializeDatabase() {
  try {
    await connectToMongoDB();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Create tenant database
async function createTenantDatabase(tenantId) {
  try {
    // MongoDB databases are created automatically when first document is inserted
    // No need to explicitly create collections
    console.log(`MongoDB tenant database will be created for tenant: ${tenantId} when first document is inserted`);
  } catch (error) {
    console.error(`Failed to create tenant database for ${tenantId}:`, error);
    throw error;
  }
}

// Close database connections
async function closeDatabaseConnections() {
  try {
    if (mongoClient) {
      await mongoClient.close();
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}

// Get collection with tenant support
function getCollection(collectionName, tenantId = null) {
  const db = getMongoDb(tenantId);
  return db.collection(collectionName);
}

module.exports = {
  connectToMongoDB,
  initializeDatabase,
  getMongoDb,
  createTenantDatabase,
  closeDatabaseConnections,
  getCollection,
  // Legacy support
  getDB: () => getMongoDb()
};