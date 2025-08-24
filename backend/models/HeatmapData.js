const { ObjectId } = require('mongodb');
const { getMongoDb } = require('../config/database');

class HeatmapData {
  constructor(heatmapData) {
    this._id = heatmapData._id || heatmapData.id;
    this.tenant_id = heatmapData.tenant_id;
    this.session_id = heatmapData.session_id || heatmapData.sessionId;
    this.user_id = heatmapData.user_id || heatmapData.userId;
    this.page = heatmapData.page;
    this.url = heatmapData.url;
    this.event_type = heatmapData.event_type || heatmapData.eventType; // 'click', 'move', 'scroll'
    this.position = heatmapData.position; // { x, y, pageX, pageY }
    this.element = heatmapData.element; // target element info
    this.value = heatmapData.value || (heatmapData.event_type === 'click' ? 5 : 1); // heatmap intensity
    this.device_info = heatmapData.device_info || heatmapData.device;
    this.user_info = heatmapData.user_info || heatmapData.user;
    this.timestamp = heatmapData.timestamp || new Date();
    this.viewport = heatmapData.viewport; // viewport dimensions
    this.scroll_position = heatmapData.scroll_position || heatmapData.scrollPosition;
    this.created_at = heatmapData.created_at || new Date();
  }

  static getCollection(tenantId = null) {
    const db = getMongoDb(tenantId);
    return db.collection('heatmap_data');
  }

  async save(tenantId = null) {
    const collection = this.constructor.getCollection(tenantId);
    const docToInsert = {
      tenant_id: this.tenant_id,
      session_id: this.session_id,
      user_id: this.user_id,
      page: this.page,
      url: this.url,
      event_type: this.event_type,
      position: this.position,
      element: this.element,
      value: this.value,
      device_info: this.device_info,
      user_info: this.user_info,
      timestamp: this.timestamp,
      viewport: this.viewport,
      scroll_position: this.scroll_position,
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

  static async getHeatmapPointsForPage(page, tenantId = null, options = {}) {
    const collection = this.getCollection(tenantId);
    const query = { 
      page,
      event_type: { $in: ['click', 'move'] },
      position: { $exists: true }
    };
    
    if (tenantId) query.tenant_id = tenantId;
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
      if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
    }

    const heatmapData = await collection.find(query).toArray();
    
    if (heatmapData.length === 0) {
      return {
        data: [],
        max: 1,
        message: `No interactions found for ${page}. Visit this page and interact with it first.`
      };
    }

    const heatmapPoints = heatmapData.map(item => ({
      x: item.position?.pageX || item.position?.x || 0,
      y: item.position?.pageY || item.position?.y || 0,
      value: item.value || (item.event_type === 'click' ? 5 : 1)
    }));

    return {
      data: heatmapPoints,
      max: Math.max(...heatmapPoints.map(p => p.value), 5)
    };
  }

  static async saveHeatmapPoint(data, tenantId = null) {
    const heatmapPoint = new HeatmapData(data);
    return await heatmapPoint.save(tenantId);
  }

  static async getVisitorData(tenantId = null, options = {}) {
    const collection = this.getCollection(tenantId);
    const query = { event_type: 'page_visit' };
    
    if (tenantId) query.tenant_id = tenantId;
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
      if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
    }

    const visitors = await collection.find(query)
      .sort({ timestamp: -1 })
      .limit(options.limit || 50)
      .toArray();

    return visitors.map(visitor => ({
      sessionId: visitor.session_id,
      page: visitor.page,
      url: visitor.url,
      timestamp: visitor.timestamp,
      device: visitor.device_info,
      user: visitor.user_info,
      referrer: visitor.referrer || null
    }));
  }

  static async bulkSaveHeatmapPoints(points, tenantId = null) {
    if (!points || points.length === 0) return { insertedCount: 0 };

    const collection = this.getCollection(tenantId);
    const documentsToInsert = points.map(point => ({
      tenant_id: point.tenant_id || tenantId,
      session_id: point.session_id || point.sessionId,
      user_id: point.user_id || point.userId || 'guest',
      page: point.page,
      url: point.url,
      event_type: point.event_type || point.eventType,
      position: point.position,
      element: point.element,
      value: point.value || (point.event_type === 'click' ? 5 : 1),
      device_info: point.device_info || point.device,
      user_info: point.user_info || point.user,
      timestamp: new Date(point.timestamp || Date.now()),
      viewport: point.viewport,
      scroll_position: point.scroll_position || point.scrollPosition,
      created_at: new Date()
    }));

    return await collection.insertMany(documentsToInsert);
  }

  // Helper method to convert MongoDB document to HeatmapData instance
  static fromDocument(doc) {
    if (!doc) return null;
    return new HeatmapData({
      _id: doc._id,
      tenant_id: doc.tenant_id,
      session_id: doc.session_id,
      user_id: doc.user_id,
      page: doc.page,
      url: doc.url,
      event_type: doc.event_type,
      position: doc.position,
      element: doc.element,
      value: doc.value,
      device_info: doc.device_info,
      user_info: doc.user_info,
      timestamp: doc.timestamp,
      viewport: doc.viewport,
      scroll_position: doc.scroll_position,
      created_at: doc.created_at
    });
  }
}

module.exports = HeatmapData;