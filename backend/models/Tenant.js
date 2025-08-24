const { ObjectId } = require('mongodb');
const { getMongoDb } = require('../config/database');

class Tenant {
  constructor(tenantData) {
    this._id = tenantData._id || tenantData.id;
    this.name = tenantData.name;
    this.subdomain = tenantData.subdomain;
    this.database_name = tenantData.database_name;
    this.status = tenantData.status || 'active';
    this.settings = tenantData.settings || {};
    this.created_at = tenantData.created_at || new Date();
    this.updated_at = tenantData.updated_at || new Date();
  }

  static getCollection() {
    const db = getMongoDb();
    return db.collection('tenants');
  }

  async save() {
    const collection = this.constructor.getCollection();
    const result = await collection.insertOne({
      name: this.name,
      subdomain: this.subdomain,
      database_name: this.database_name,
      status: this.status,
      settings: this.settings,
      created_at: this.created_at,
      updated_at: this.updated_at
    });
    
    this._id = result.insertedId;
    return result;
  }

  static async findBySubdomain(subdomain) {
    const collection = this.getCollection();
    return await collection.findOne({ subdomain });
  }

  static async findById(id) {
    const collection = this.getCollection();
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async findAll(options = {}) {
    const collection = this.getCollection();
    const cursor = collection.find(options.where || {});
    
    if (options.limit) cursor.limit(options.limit);
    if (options.skip) cursor.skip(options.skip);
    if (options.sort) cursor.sort(options.sort);
    
    return await cursor.toArray();
  }

  async update(updateData) {
    Object.assign(this, updateData);
    this.updated_at = new Date();

    const collection = this.constructor.getCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(this._id) },
      { $set: { ...updateData, updated_at: this.updated_at } }
    );
    
    return result;
  }

  async delete() {
    const collection = this.constructor.getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(this._id) });
    return result;
  }

  static async getActiveTenantsCount() {
    const collection = this.getCollection();
    return await collection.countDocuments({ status: 'active' });
  }

  // Helper method to convert MongoDB document to Tenant instance
  static fromDocument(doc) {
    if (!doc) return null;
    return new Tenant({
      _id: doc._id,
      name: doc.name,
      subdomain: doc.subdomain,
      database_name: doc.database_name,
      status: doc.status,
      settings: doc.settings,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    });
  }
}

module.exports = Tenant;