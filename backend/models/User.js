const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { getMongoDb, getCollection } = require('../config/database');

class User {
  constructor(userData) {
    this._id = userData._id || userData.id;
    this.tenant_id = userData.tenant_id;
    this.name = userData.name;
    this.email = userData.email;
    this.password = userData.password;
    this.storeName = userData.storeName;
    this.domainName = userData.domainName;
    this.summary = userData.summary;
    this.google_id = userData.google_id || userData.googleId;
    this.avatar = userData.avatar;
    this.role = userData.role || 'user';
    this.status = userData.status || 'active';
    this.email_verified = userData.email_verified || false;
    this.last_login = userData.last_login;
    this.created_at = userData.created_at || userData.createdAt || new Date();
    this.updated_at = userData.updated_at || new Date();
  }

  static getCollection(tenantId = null) {
    // For tenant ID 1 or no tenant, use the main database for frontend compatibility
    if (!tenantId || tenantId === 1) {
      const db = getMongoDb(); // Main database
      return db.collection('users');
    }
    const db = getMongoDb(tenantId);
    return db.collection('users');
  }

  async save(tenantId = null) {
    const collection = this.constructor.getCollection(tenantId);
    const docToInsert = {
      tenant_id: this.tenant_id,
      name: this.name,
      email: this.email,
      password: this.password,
      storeName: this.storeName,
      domainName: this.domainName,
      summary: this.summary,
      google_id: this.google_id,
      avatar: this.avatar,
      role: this.role,
      status: this.status,
      email_verified: this.email_verified,
      last_login: this.last_login,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
    
    console.log('Inserting document to MongoDB:', JSON.stringify(docToInsert));
    console.log('Collection namespace:', collection.namespace);
    
    const result = await collection.insertOne(docToInsert);
    this._id = result.insertedId;
    
    return result;
  }

  static async findById(id, tenantId = null) {
    const collection = this.getCollection(tenantId);
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async findByEmail(email, tenantId = null) {
    // For authentication, always use main database
    const collection = this.getCollection(); // Main database without tenant
    const query = { email };
    if (tenantId) query.tenant_id = tenantId;
    return await collection.findOne(query);
  }

  static async findByGoogleId(googleId, tenantId = null) {
    // For authentication, always use main database
    const collection = this.getCollection(); // Main database without tenant
    const query = { google_id: googleId };
    if (tenantId) query.tenant_id = tenantId;
    return await collection.findOne(query);
  }

  static async findAll(tenantId = null, options = {}) {
    console.log('Getting MongoDB collection for tenant ID:', tenantId);
    const collection = this.getCollection(tenantId);
    console.log('Collection namespace:', collection.namespace);
    const query = { ...options.where };
    if (tenantId) query.tenant_id = tenantId;
    console.log('Query:', query);
    
    const cursor = collection.find(query);
    
    if (options.limit) cursor.limit(options.limit);
    if (options.skip) cursor.skip(options.skip);
    if (options.sort) cursor.sort(options.sort);
    
    const results = await cursor.toArray();
    console.log('Found documents:', results.length);
    return results;
  }

  static async updateById(id, updateData, tenantId = null) {
    updateData.updated_at = new Date();
    
    const collection = this.getCollection(tenantId);
    const query = { _id: new ObjectId(id) };
    if (tenantId) query.tenant_id = tenantId;
    
    const result = await collection.updateOne(
      query,
      { $set: updateData }
    );
    return result;
  }

  static async deleteById(id, tenantId = null) {
    const collection = this.getCollection(tenantId);
    const query = { _id: new ObjectId(id) };
    if (tenantId) query.tenant_id = tenantId;
    
    const result = await collection.deleteOne(query);
    return result;
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async getUsersCount(tenantId = null) {
    const collection = this.getCollection(tenantId);
    const query = {};
    if (tenantId) query.tenant_id = tenantId;
    
    return await collection.countDocuments(query);
  }

  async updateLastLogin(tenantId = null) {
    const updateData = { last_login: new Date() };
    
    if (this._id) {
      return await this.constructor.updateById(this._id, updateData, tenantId);
    }
  }

  // Helper method to convert MongoDB document to User instance
  static fromDocument(doc) {
    if (!doc) return null;
    return new User({
      _id: doc._id,
      tenant_id: doc.tenant_id,
      name: doc.name,
      email: doc.email,
      password: doc.password,
      storeName: doc.storeName,
      domainName: doc.domainName,
      summary: doc.summary,
      google_id: doc.google_id,
      avatar: doc.avatar,
      role: doc.role,
      status: doc.status,
      email_verified: doc.email_verified,
      last_login: doc.last_login,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    });
  }
}

module.exports = User;