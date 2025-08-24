const express = require('express');
const HeatmapData = require('../models/HeatmapData');
const router = express.Router();

// Save a single heatmap interaction point
router.post('/track-interaction', async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      page,
      url,
      eventType,
      position,
      element,
      value,
      device,
      user,
      viewport,
      scrollPosition
    } = req.body;

    // Extract tenant_id from user info or default to null for guests
    const tenant_id = user?.tenantId || null;
    const user_id = user?.userId || userId || 'guest';

    const heatmapPoint = {
      tenant_id,
      session_id: sessionId,
      user_id,
      page,
      url,
      event_type: eventType,
      position,
      element,
      value: value || (eventType === 'click' ? 5 : 1),
      device_info: device,
      user_info: user,
      viewport,
      scroll_position: scrollPosition,
      timestamp: new Date()
    };

    await HeatmapData.saveHeatmapPoint(heatmapPoint, tenant_id);

    res.json({
      success: true,
      message: 'Heatmap interaction tracked successfully'
    });
  } catch (error) {
    console.error('Heatmap tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track heatmap interaction'
    });
  }
});

// Bulk save heatmap points (for localStorage migration)
router.post('/bulk-save', async (req, res) => {
  try {
    const { points, tenantId } = req.body;

    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Points array is required and must not be empty'
      });
    }

    const result = await HeatmapData.bulkSaveHeatmapPoints(points, tenantId);

    res.json({
      success: true,
      message: `Successfully saved ${result.insertedCount} heatmap points`,
      insertedCount: result.insertedCount
    });
  } catch (error) {
    console.error('Bulk save heatmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk save heatmap points'
    });
  }
});

// Get heatmap data for a specific page
router.get('/data/:page', async (req, res) => {
  try {
    const page = '/' + (req.params.page === 'root' ? '' : req.params.page);
    const { startDate, endDate, tenantId } = req.query;

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const heatmapData = await HeatmapData.getHeatmapPointsForPage(page, tenantId || null, options);

    res.json({
      success: true,
      ...heatmapData,
      meta: {
        page,
        dateRange: { startDate, endDate },
        tenantId
      }
    });
  } catch (error) {
    console.error('Get heatmap data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve heatmap data'
    });
  }
});

// Get heatmap data for a specific page (alternative endpoint format)
router.get('/data', async (req, res) => {
  try {
    const { page, startDate, endDate, tenantId } = req.query;

    if (!page) {
      return res.status(400).json({
        success: false,
        message: 'Page parameter is required'
      });
    }

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const heatmapData = await HeatmapData.getHeatmapPointsForPage(page, tenantId || null, options);

    res.json({
      success: true,
      ...heatmapData,
      meta: {
        page,
        dateRange: { startDate, endDate },
        tenantId
      }
    });
  } catch (error) {
    console.error('Get heatmap data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve heatmap data'
    });
  }
});

// Get visitor data from heatmap collection
router.get('/visitors', async (req, res) => {
  try {
    const { startDate, endDate, tenantId, limit = 50 } = req.query;

    const options = { limit: parseInt(limit) };
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const visitors = await HeatmapData.getVisitorData(tenantId || null, options);

    res.json({
      success: true,
      data: visitors,
      meta: {
        dateRange: { startDate, endDate },
        tenantId,
        limit
      }
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve visitor data'
    });
  }
});

// Save visitor information
router.post('/track-visitor', async (req, res) => {
  try {
    const {
      sessionId,
      page,
      url,
      timestamp,
      device,
      user,
      referrer
    } = req.body;

    const tenant_id = user?.tenantId || null;
    const user_id = user?.userId || 'guest';

    const visitorData = {
      tenant_id,
      session_id: sessionId,
      user_id,
      page,
      url,
      event_type: 'page_visit',
      device_info: device,
      user_info: user,
      referrer,
      timestamp: new Date(timestamp)
    };

    await HeatmapData.saveHeatmapPoint(visitorData, tenant_id);

    res.json({
      success: true,
      message: 'Visitor information tracked successfully'
    });
  } catch (error) {
    console.error('Visitor tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track visitor information'
    });
  }
});

// Migrate localStorage data to MongoDB
router.post('/migrate-localstorage', async (req, res) => {
  try {
    const { heatmapData, visitorData, tenantId } = req.body;
    let migratedCount = 0;

    // Migrate heatmap data
    if (heatmapData && Object.keys(heatmapData).length > 0) {
      for (const [page, points] of Object.entries(heatmapData)) {
        if (Array.isArray(points) && points.length > 0) {
          const formattedPoints = points.map(point => ({
            tenant_id: tenantId || null,
            session_id: `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: 'guest',
            page: page,
            url: `${req.protocol}://${req.get('host')}${page}`,
            event_type: point.value > 3 ? 'click' : 'move',
            position: {
              x: point.x,
              y: point.y,
              pageX: point.x,
              pageY: point.y
            },
            value: point.value || 1,
            timestamp: new Date()
          }));

          const result = await HeatmapData.bulkSaveHeatmapPoints(formattedPoints, tenantId);
          migratedCount += result.insertedCount;
        }
      }
    }

    // Migrate visitor data
    if (visitorData && Array.isArray(visitorData)) {
      const formattedVisitors = visitorData.map(visitor => ({
        tenant_id: tenantId || null,
        session_id: visitor.sessionId,
        user_id: visitor.user?.userId || 'guest',
        page: visitor.page,
        url: visitor.url,
        event_type: 'page_visit',
        device_info: visitor.device,
        user_info: visitor.user,
        referrer: visitor.referrer,
        timestamp: new Date(visitor.timestamp)
      }));

      const result = await HeatmapData.bulkSaveHeatmapPoints(formattedVisitors, tenantId);
      migratedCount += result.insertedCount;
    }

    res.json({
      success: true,
      message: `Successfully migrated ${migratedCount} records from localStorage to MongoDB`,
      migratedCount
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate localStorage data'
    });
  }
});

module.exports = router;