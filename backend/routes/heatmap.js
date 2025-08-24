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

// Track guest user visit with fingerprinting
router.post('/track-guest-visit', async (req, res) => {
  try {
    const {
      guestId,
      fingerprint,
      visitCount,
      isReturning,
      returnVisits,
      sessionId,
      page,
      url,
      device,
      tenantId
    } = req.body;

    const guestVisit = {
      tenant_id: tenantId || null,
      session_id: sessionId,
      user_id: guestId,
      guest_fingerprint: fingerprint,
      visit_count: visitCount,
      is_returning: isReturning,
      return_visits: returnVisits,
      page,
      url,
      event_type: 'guest_visit',
      device_info: device,
      timestamp: new Date()
    };

    await HeatmapData.saveHeatmapPoint(guestVisit, tenantId);

    res.json({
      success: true,
      message: 'Guest visit tracked successfully',
      guestId,
      visitCount,
      isReturning
    });
  } catch (error) {
    console.error('Guest visit tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track guest visit'
    });
  }
});

// Get guest statistics
router.get('/guest-stats', async (req, res) => {
  try {
    const { tenantId, startDate, endDate } = req.query;
    
    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const stats = await HeatmapData.getGuestStatistics(tenantId || null, options);

    res.json({
      success: true,
      data: stats,
      meta: {
        tenantId,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Get guest stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guest statistics'
    });
  }
});

// Clear all heatmap data from MongoDB
router.delete('/clear-all-data', async (req, res) => {
  try {
    const { tenantId, confirm } = req.body;

    // Safety check - require explicit confirmation
    if (confirm !== 'DELETE_ALL_HEATMAP_DATA') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Send "confirm": "DELETE_ALL_HEATMAP_DATA" to proceed.'
      });
    }

    let totalDeleted = 0;
    const results = [];

    // Get database connection
    const { getMongoDb } = require('../config/database');
    const db = getMongoDb(tenantId || null);

    // Clear main heatmap_data collection
    const heatmapCollection = db.collection('heatmap_data');
    const heatmapResult = await heatmapCollection.deleteMany({});
    totalDeleted += heatmapResult.deletedCount;
    results.push(`heatmap_data: ${heatmapResult.deletedCount} records`);

    // Clear analytics collection if it exists
    try {
      const analyticsCollection = db.collection('analytics');
      const analyticsResult = await analyticsCollection.deleteMany({});
      if (analyticsResult.deletedCount > 0) {
        totalDeleted += analyticsResult.deletedCount;
        results.push(`analytics: ${analyticsResult.deletedCount} records`);
      }
    } catch (err) {
      console.log('Analytics collection not found or empty');
    }

    // Clear visitors collection if it exists
    try {
      const visitorsCollection = db.collection('visitors');
      const visitorsResult = await visitorsCollection.deleteMany({});
      if (visitorsResult.deletedCount > 0) {
        totalDeleted += visitorsResult.deletedCount;
        results.push(`visitors: ${visitorsResult.deletedCount} records`);
      }
    } catch (err) {
      console.log('Visitors collection not found or empty');
    }

    // Also check for tenant-specific databases
    if (!tenantId) {
      try {
        const admin = db.admin();
        const dbs = await admin.listDatabases();
        
        for (const dbInfo of dbs.databases) {
          if (dbInfo.name.startsWith('tenant_')) {
            console.log(`Checking tenant database: ${dbInfo.name}`);
            const tenantDb = getMongoDb(dbInfo.name.replace('tenant_', ''));
            
            const tenantHeatmap = tenantDb.collection('heatmap_data');
            const tenantResult = await tenantHeatmap.deleteMany({});
            if (tenantResult.deletedCount > 0) {
              totalDeleted += tenantResult.deletedCount;
              results.push(`${dbInfo.name}/heatmap_data: ${tenantResult.deletedCount} records`);
            }
          }
        }
      } catch (err) {
        console.log('Could not check tenant databases:', err.message);
      }
    }

    console.log(`🗑️ Total cleared: ${totalDeleted} records from ${results.length} sources`);
    console.log('Cleared from:', results.join(', '));

    res.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} total records`,
      deletedCount: totalDeleted,
      details: results
    });
  } catch (error) {
    console.error('Clear all data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear heatmap data'
    });
  }
});

// Get total count of heatmap records across all collections
router.get('/data-count', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const { getMongoDb } = require('../config/database');
    const db = getMongoDb(tenantId || null);
    
    let totalCount = 0;
    const details = [];

    // Count heatmap_data collection
    const heatmapCollection = db.collection('heatmap_data');
    const heatmapCount = await heatmapCollection.countDocuments({});
    totalCount += heatmapCount;
    if (heatmapCount > 0) details.push(`heatmap_data: ${heatmapCount}`);

    // Count analytics collection
    try {
      const analyticsCollection = db.collection('analytics');
      const analyticsCount = await analyticsCollection.countDocuments({});
      totalCount += analyticsCount;
      if (analyticsCount > 0) details.push(`analytics: ${analyticsCount}`);
    } catch (err) {
      // Collection doesn't exist
    }

    // Count visitors collection  
    try {
      const visitorsCollection = db.collection('visitors');
      const visitorsCount = await visitorsCollection.countDocuments({});
      totalCount += visitorsCount;
      if (visitorsCount > 0) details.push(`visitors: ${visitorsCount}`);
    } catch (err) {
      // Collection doesn't exist
    }

    // Check tenant databases if not specifying a tenant
    if (!tenantId) {
      try {
        const admin = db.admin();
        const dbs = await admin.listDatabases();
        
        for (const dbInfo of dbs.databases) {
          if (dbInfo.name.startsWith('tenant_')) {
            const tenantDb = getMongoDb(dbInfo.name.replace('tenant_', ''));
            const tenantHeatmap = tenantDb.collection('heatmap_data');
            const tenantCount = await tenantHeatmap.countDocuments({});
            if (tenantCount > 0) {
              totalCount += tenantCount;
              details.push(`${dbInfo.name}: ${tenantCount}`);
            }
          }
        }
      } catch (err) {
        console.log('Could not check tenant databases:', err.message);
      }
    }

    res.json({
      success: true,
      count: totalCount,
      message: `Database contains ${totalCount} total records`,
      details: details
    });
  } catch (error) {
    console.error('Get data count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get data count'
    });
  }
});

// Admin page for easy data management
router.get('/admin', async (req, res) => {
  try {
    const collection = HeatmapData.getCollection(null);
    const count = await collection.countDocuments({});
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Heatmap Data Admin</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
            button { padding: 10px 20px; margin: 10px; border: none; border-radius: 5px; cursor: pointer; }
            .danger { background: #dc3545; color: white; }
            .info { background: #17a2b8; color: white; }
            .success { background: #28a745; color: white; }
        </style>
    </head>
    <body>
        <h1>🔥 Heatmap Data Administration</h1>
        
        <div class="card">
            <h3>📊 Current Status</h3>
            <p><strong>Database Records:</strong> ${count}</p>
            <p><strong>Status:</strong> ${count === 0 ? '✅ Clean (No data)' : '📈 Contains data'}</p>
        </div>
        
        <div class="card">
            <h3>🗑️ Data Management</h3>
            <p>Use these buttons to manage your heatmap data:</p>
            
            <button class="info" onclick="refreshCount()">🔄 Refresh Count</button>
            <button class="danger" onclick="clearAllData()" ${count === 0 ? 'disabled' : ''}>
                🗑️ Clear All Data (${count} records)
            </button>
        </div>
        
        <div class="card" id="result" style="display: none;">
            <h3 id="resultTitle">Result</h3>
            <p id="resultMessage"></p>
        </div>

        <script>
            async function refreshCount() {
                try {
                    const response = await fetch('/api/heatmap/data-count');
                    const data = await response.json();
                    location.reload(); // Simple refresh
                } catch (error) {
                    showResult('❌ Error', 'Failed to refresh count: ' + error.message);
                }
            }

            async function clearAllData() {
                const currentCount = ${count};
                if (currentCount === 0) {
                    showResult('ℹ️ Info', 'Database is already empty!');
                    return;
                }

                if (!confirm(\`Are you sure you want to delete all \${currentCount} heatmap records? This cannot be undone!\`)) {
                    return;
                }

                try {
                    const response = await fetch('/api/heatmap/clear-all-data', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            confirm: 'DELETE_ALL_HEATMAP_DATA',
                            tenantId: null
                        })
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        showResult('✅ Success', \`Deleted \${result.deletedCount} records successfully!\`);
                        setTimeout(() => location.reload(), 2000);
                    } else {
                        showResult('❌ Error', result.message);
                    }
                } catch (error) {
                    showResult('❌ Error', 'Failed to clear data: ' + error.message);
                }
            }

            function showResult(title, message) {
                document.getElementById('resultTitle').textContent = title;
                document.getElementById('resultMessage').textContent = message;
                document.getElementById('result').style.display = 'block';
            }
        </script>
    </body>
    </html>`;

    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading admin page: ' + error.message);
  }
});

module.exports = router;