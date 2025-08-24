const express = require('express');
const Analytics = require('../models/Analytics');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Track user interaction
router.post('/track', async (req, res) => {
  try {
    const {
      sessionId,
      eventType,
      page,
      timestamp,
      position,
      element,
      device,
      user,
      timeSpent,
      scrollPosition,
      referrer,
      url
    } = req.body;

    // Extract tenant_id from user info or default to null for guests
    const tenant_id = user?.tenantId || null;
    const user_id = user?.userId || 'guest';

    const analyticsData = new Analytics({
      tenant_id,
      session_id: sessionId,
      user_id,
      event_type: eventType,
      page,
      position,
      element,
      device_info: device,
      user_info: user,
      timestamp: new Date(timestamp),
      time_spent: timeSpent,
      scroll_position: scrollPosition,
      referrer,
      url
    });

    // Save to MongoDB for better analytics queries
    await analyticsData.save('mongodb', tenant_id);

    res.json({
      success: true,
      message: 'Analytics data tracked successfully'
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track analytics data'
    });
  }
});

// Get heatmap data for a specific page
router.get('/heatmap-data', async (req, res) => {
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

    const heatmapData = await Analytics.getHeatmapData(page, tenantId || null, options);

    res.json({
      success: true,
      data: heatmapData,
      meta: {
        page,
        dateRange: { startDate, endDate },
        tenantId
      }
    });
  } catch (error) {
    console.error('Heatmap data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve heatmap data'
    });
  }
});

// Get page views statistics
router.get('/page-views', async (req, res) => {
  try {
    const { startDate, endDate, tenantId } = req.query;
    const tenant_id = tenantId || null;

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const pageViews = await Analytics.getPageViews(tenant_id, options);

    res.json({
      success: true,
      data: pageViews,
      meta: {
        dateRange: { startDate, endDate },
        tenant_id
      }
    });
  } catch (error) {
    console.error('Page views error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve page views data'
    });
  }
});

// Get user statistics
router.get('/user-stats', async (req, res) => {
  try {
    const { startDate, endDate, tenantId } = req.query;
    const tenant_id = tenantId || null;

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const userStats = await Analytics.getUserStats(tenant_id, options);

    res.json({
      success: true,
      data: userStats,
      meta: {
        dateRange: { startDate, endDate },
        tenant_id
      }
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics'
    });
  }
});

// Get device statistics
router.get('/device-stats', async (req, res) => {
  try {
    const { startDate, endDate, tenantId } = req.query;
    const tenant_id = tenantId || null;

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const deviceStats = await Analytics.getDeviceStats(tenant_id, options);

    res.json({
      success: true,
      data: deviceStats,
      meta: {
        dateRange: { startDate, endDate },
        tenant_id
      }
    });
  } catch (error) {
    console.error('Device stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve device statistics'
    });
  }
});

// Get analytics by page
router.get('/page/:pageName', async (req, res) => {
  try {
    const { pageName } = req.params;
    const { startDate, endDate, limit = 100, skip = 0, tenantId } = req.query;
    const tenant_id = tenantId || null;

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip)
    };
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const pageAnalytics = await Analytics.findByPage(pageName, tenant_id, 'mongodb', options);

    res.json({
      success: true,
      data: pageAnalytics,
      meta: {
        page: pageName,
        dateRange: { startDate, endDate },
        tenant_id,
        limit,
        skip
      }
    });
  } catch (error) {
    console.error('Page analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve page analytics'
    });
  }
});

// Get session analytics
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { tenantId } = req.query;
    const tenant_id = tenantId || null;

    const sessionAnalytics = await Analytics.findByPage('/', tenant_id, 'mongodb', {
      where: { session_id: sessionId }
    });

    res.json({
      success: true,
      data: sessionAnalytics,
      meta: {
        sessionId,
        tenant_id
      }
    });
  } catch (error) {
    console.error('Session analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session analytics'
    });
  }
});

// Get analytics summary/dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate, tenantId } = req.query;
    const tenant_id = tenantId || null;

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    // Get all analytics data in parallel
    const [pageViews, userStats, deviceStats] = await Promise.all([
      Analytics.getPageViews(tenant_id, options),
      Analytics.getUserStats(tenant_id, options),
      Analytics.getDeviceStats(tenant_id, options)
    ]);

    const summary = {
      totalPageViews: pageViews.reduce((sum, page) => sum + page.views, 0),
      uniqueUsers: userStats.length,
      totalSessions: userStats.reduce((sum, user) => sum + user.session_count, 0),
      topPages: pageViews.slice(0, 10),
      deviceBreakdown: deviceStats.slice(0, 10),
      authenticatedUsers: userStats.filter(user => user.is_authenticated).length,
      guestUsers: userStats.filter(user => !user.is_authenticated).length
    };

    res.json({
      success: true,
      data: summary,
      meta: {
        dateRange: { startDate, endDate },
        tenant_id
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard analytics'
    });
  }
});

module.exports = router;