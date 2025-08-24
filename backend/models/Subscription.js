const { ObjectId } = require('mongodb');
const { getMongoDb } = require('../config/database');

class Subscription {
  constructor(subscriptionData) {
    this._id = subscriptionData._id || subscriptionData.id;
    this.tenant_id = subscriptionData.tenant_id;
    this.plan_name = subscriptionData.plan_name;
    this.plan_type = subscriptionData.plan_type;
    this.status = subscriptionData.status || 'active';
    this.billing_cycle = subscriptionData.billing_cycle || 'monthly';
    this.price = subscriptionData.price || 0.00;
    this.currency = subscriptionData.currency || 'USD';
    this.max_users = subscriptionData.max_users;
    this.max_storage = subscriptionData.max_storage;
    this.features = subscriptionData.features || {};
    this.trial_ends_at = subscriptionData.trial_ends_at;
    this.current_period_start = subscriptionData.current_period_start || new Date();
    this.current_period_end = subscriptionData.current_period_end;
    this.cancelled_at = subscriptionData.cancelled_at;
    this.created_at = subscriptionData.created_at || new Date();
    this.updated_at = subscriptionData.updated_at || new Date();
  }

  static getCollection(tenantId = null) {
    const db = getMongoDb(tenantId);
    return db.collection('subscriptions');
  }

  async save(tenantId = null) {
    const collection = this.constructor.getCollection(tenantId);
    const result = await collection.insertOne({
      tenant_id: this.tenant_id,
      plan_name: this.plan_name,
      plan_type: this.plan_type,
      status: this.status,
      billing_cycle: this.billing_cycle,
      price: this.price,
      currency: this.currency,
      max_users: this.max_users,
      max_storage: this.max_storage,
      features: this.features,
      trial_ends_at: this.trial_ends_at,
      current_period_start: this.current_period_start,
      current_period_end: this.current_period_end,
      cancelled_at: this.cancelled_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    });
    
    this._id = result.insertedId;
    return result;
  }

  static async findByTenantId(tenantId) {
    const collection = this.getCollection();
    return await collection.findOne(
      { tenant_id: tenantId },
      { sort: { created_at: -1 } }
    );
  }

  static async findById(id, tenantId = null) {
    const collection = this.getCollection(tenantId);
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async findAll(tenantId = null, options = {}) {
    const collection = this.getCollection(tenantId);
    const query = { ...options.where };
    if (tenantId) query.tenant_id = tenantId;
    
    const cursor = collection.find(query);
    
    if (options.limit) cursor.limit(options.limit);
    if (options.skip) cursor.skip(options.skip);
    if (options.sort) cursor.sort(options.sort);
    
    return await cursor.toArray();
  }

  async update(updateData, tenantId = null) {
    Object.assign(this, updateData);
    this.updated_at = new Date();

    const collection = this.constructor.getCollection(tenantId);
    const result = await collection.updateOne(
      { _id: new ObjectId(this._id) },
      { $set: { ...updateData, updated_at: this.updated_at } }
    );
    
    return result;
  }

  async cancel(tenantId = null) {
    const cancelData = {
      status: 'cancelled',
      cancelled_at: new Date()
    };
    
    return await this.update(cancelData, tenantId);
  }

  isActive() {
    return this.status === 'active' && new Date() < new Date(this.current_period_end);
  }

  isInTrial() {
    return this.trial_ends_at && new Date() < new Date(this.trial_ends_at);
  }

  hasFeature(featureName) {
    return this.features && this.features[featureName] === true;
  }

  static async getActiveSubscriptionsCount() {
    const collection = this.getCollection();
    return await collection.countDocuments({ status: 'active' });
  }

  static getDefaultPlans() {
    return {
      free: {
        plan_name: 'Free Plan',
        plan_type: 'free',
        price: 0.00,
        max_users: 5,
        max_storage: 1024 * 1024 * 1024, // 1GB
        features: {
          basic_dashboard: true,
          email_support: false,
          api_access: false,
          advanced_analytics: false,
          priority_support: false
        }
      },
      basic: {
        plan_name: 'Basic Plan',
        plan_type: 'basic',
        price: 29.99,
        max_users: 25,
        max_storage: 10 * 1024 * 1024 * 1024, // 10GB
        features: {
          basic_dashboard: true,
          email_support: true,
          api_access: true,
          advanced_analytics: false,
          priority_support: false
        }
      },
      premium: {
        plan_name: 'Premium Plan',
        plan_type: 'premium',
        price: 79.99,
        max_users: 100,
        max_storage: 50 * 1024 * 1024 * 1024, // 50GB
        features: {
          basic_dashboard: true,
          email_support: true,
          api_access: true,
          advanced_analytics: true,
          priority_support: true
        }
      },
      enterprise: {
        plan_name: 'Enterprise Plan',
        plan_type: 'enterprise',
        price: 199.99,
        max_users: -1, // unlimited
        max_storage: -1, // unlimited
        features: {
          basic_dashboard: true,
          email_support: true,
          api_access: true,
          advanced_analytics: true,
          priority_support: true,
          white_label: true,
          custom_integrations: true
        }
      }
    };
  }

  // Helper method to convert MongoDB document to Subscription instance
  static fromDocument(doc) {
    if (!doc) return null;
    return new Subscription({
      _id: doc._id,
      tenant_id: doc.tenant_id,
      plan_name: doc.plan_name,
      plan_type: doc.plan_type,
      status: doc.status,
      billing_cycle: doc.billing_cycle,
      price: doc.price,
      currency: doc.currency,
      max_users: doc.max_users,
      max_storage: doc.max_storage,
      features: doc.features,
      trial_ends_at: doc.trial_ends_at,
      current_period_start: doc.current_period_start,
      current_period_end: doc.current_period_end,
      cancelled_at: doc.cancelled_at,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    });
  }
}

module.exports = Subscription;