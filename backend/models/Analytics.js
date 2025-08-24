const { ObjectId } = require('mongodb');
const { getMongoDb } = require('../config/database');

class Analytics {
  constructor(analyticsData) {
    this._id = analyticsData._id || analyticsData.id;
    this.tenant_id = analyticsData.tenant_id;
    this.session_id = analyticsData.session_id || analyticsData.sessionId;
    this.user_id = analyticsData.user_id || analyticsData.userId;
    this.event_type = analyticsData.event_type || analyticsData.eventType;
    this.page = analyticsData.page;
    this.position = analyticsData.position;
    this.element = analyticsData.element;
    this.device_info = analyticsData.device_info || analyticsData.device;
    this.user_info = analyticsData.user_info || analyticsData.user;
    this.timestamp = analyticsData.timestamp || new Date();
    this.time_spent = analyticsData.time_spent || analyticsData.timeSpent;
    this.scroll_position = analyticsData.scroll_position || analyticsData.scrollPosition;
    this.referrer = analyticsData.referrer;
    this.url = analyticsData.url;
    this.created_at = analyticsData.created_at || new Date();
  }

  static getCollection(tenantId = null) {
    const db = getMongoDb(tenantId);
    return db.collection('analytics');
  }

  async save(tenantId = null) {
    const collection = this.constructor.getCollection(tenantId);
    const docToInsert = {
      tenant_id: this.tenant_id,
      session_id: this.session_id,
      user_id: this.user_id,
      event_type: this.event_type,
      page: this.page,
      position: this.position,
      element: this.element,
      device_info: this.device_info,
      user_info: this.user_info,
      timestamp: this.timestamp,
      time_spent: this.time_spent,
      scroll_position: this.scroll_position,
      referrer: this.referrer,
      url: this.url,
      created_at: this.created_at
    };
    
    const result = await collection.insertOne(docToInsert);
    this._id = result.insertedId;
    return result;
  }

  static async findByPage(page, tenantId = null, options = {}) {
    const collection = this.getCollection(tenantId);
    const query = { page };
    if (tenantId) query.tenant_id = tenantId;
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
      if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
    }

    const cursor = collection.find(query);
    if (options.limit) cursor.limit(options.limit);
    if (options.skip) cursor.skip(options.skip);
    cursor.sort({ timestamp: -1 });

    return await cursor.toArray();
  }

  static async getHeatmapData(page, tenantId = null, options = {}) {
    const collection = this.getCollection(tenantId);
    const query = { 
      page,
      event_type: { $in: ['click', 'mouse_move'] },
      position: { $exists: true }
    };
    
    if (tenantId) query.tenant_id = tenantId;
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
      if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
    }

    const analytics = await collection.find(query).toArray();
    
    const heatmapPoints = analytics.map(item => ({
      x: item.position?.x || 0,
      y: item.position?.y || 0,
      value: item.event_type === 'click' ? 10 : 1
    }));

    return {
      max: Math.max(...heatmapPoints.map(p => p.value), 10),
      data: heatmapPoints
    };
  }

  static async getPageViews(tenantId = null, options = {}) {
    const collection = this.getCollection(tenantId);
    const query = { event_type: 'page_visit' };
    
    if (tenantId) query.tenant_id = tenantId;
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
      if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
    }

    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: '$page',
          views: { $sum: 1 },
          unique_users: { $addToSet: '$user_id' },
          unique_sessions: { $addToSet: '$session_id' }
        }
      },
      {
        $project: {
          page: '$_id',
          views: 1,
          unique_users: { $size: '$unique_users' },
          unique_sessions: { $size: '$unique_sessions' }
        }
      },
      { $sort: { views: -1 } }
    ];

    return await collection.aggregate(pipeline).toArray();
  }

  static async getUserStats(tenantId = null, options = {}) {
    const collection = this.getCollection(tenantId);
    const query = {};
    
    if (tenantId) query.tenant_id = tenantId;
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
      if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
    }

    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: {
            user_id: '$user_id',
            is_authenticated: '$user_info.isAuthenticated'
          },
          sessions: { $addToSet: '$session_id' },
          pages_visited: { $addToSet: '$page' },
          total_events: { $sum: 1 },
          device_info: { $first: '$device_info' },
          user_info: { $first: '$user_info' }
        }
      },
      {
        $project: {
          user_id: '$_id.user_id',
          is_authenticated: '$_id.is_authenticated',
          session_count: { $size: '$sessions' },
          pages_visited: { $size: '$pages_visited' },
          total_events: 1,
          device_info: 1,
          user_info: 1
        }
      },
      { $sort: { total_events: -1 } }
    ];

    return await collection.aggregate(pipeline).toArray();
  }

  static async getDeviceStats(tenantId = null, options = {}) {
    const collection = this.getCollection(tenantId);
    const query = {};
    
    if (tenantId) query.tenant_id = tenantId;
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
      if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
    }

    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: {
            browser: '$device_info.browser',
            os: '$device_info.os',
            device: '$device_info.device'
          },
          count: { $sum: 1 },
          unique_users: { $addToSet: '$user_id' }
        }
      },
      {
        $project: {
          browser: '$_id.browser',
          os: '$_id.os',
          device: '$_id.device',
          count: 1,
          unique_users: { $size: '$unique_users' }
        }
      },
      { $sort: { count: -1 } }
    ];

    return await collection.aggregate(pipeline).toArray();
  }

  static async getDashboardStats(tenantId = null, options = {}) {
    const collection = this.getCollection(tenantId);
    const query = {};
    
    if (tenantId) query.tenant_id = tenantId;
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
      if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
    }

    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalPageViews: { 
            $sum: { $cond: [{ $eq: ['$event_type', 'page_visit'] }, 1, 0] }
          },
          uniqueUsers: { $addToSet: '$user_id' },
          totalSessions: { $addToSet: '$session_id' },
          authenticatedUsers: {
            $addToSet: {
              $cond: [{ $eq: ['$user_info.isAuthenticated', true] }, '$user_id', null]
            }
          }
        }
      },
      {
        $project: {
          totalPageViews: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          totalSessions: { $size: '$totalSessions' },
          authenticatedUsers: { 
            $size: { 
              $filter: { 
                input: '$authenticatedUsers', 
                cond: { $ne: ['$$this', null] } 
              } 
            } 
          },
          guestUsers: {
            $subtract: [
              { $size: '$uniqueUsers' },
              { 
                $size: { 
                  $filter: { 
                    input: '$authenticatedUsers', 
                    cond: { $ne: ['$$this', null] } 
                  } 
                } 
              }
            ]
          }
        }
      }
    ];

    const result = await collection.aggregate(pipeline).toArray();
    return result[0] || {
      totalPageViews: 0,
      uniqueUsers: 0,
      totalSessions: 0,
      authenticatedUsers: 0,
      guestUsers: 0
    };
  }

  // Helper method to convert MongoDB document to Analytics instance
  static fromDocument(doc) {
    if (!doc) return null;
    return new Analytics({
      _id: doc._id,
      tenant_id: doc.tenant_id,
      session_id: doc.session_id,
      user_id: doc.user_id,
      event_type: doc.event_type,
      page: doc.page,
      position: doc.position,
      element: doc.element,
      device_info: doc.device_info,
      user_info: doc.user_info,
      timestamp: doc.timestamp,
      time_spent: doc.time_spent,
      scroll_position: doc.scroll_position,
      referrer: doc.referrer,
      url: doc.url,
      created_at: doc.created_at
    });
  }
}

module.exports = Analytics;