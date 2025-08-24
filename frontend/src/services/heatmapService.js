import h337 from 'heatmapjs';
import { UAParser } from 'ua-parser-js';
import api from './api';

class HeatmapService {
  constructor() {
    this.heatmapInstance = null;
    this.parser = new UAParser();
    this.sessionId = this.generateSessionId();
    this.trackingData = [];
    this.interactions = [];
    this.isTracking = false;
    this.currentPage = null;
    this.startTime = Date.now();
    this.moveCount = 0;
    this.clickCount = 0;
    this.heatmapContainer = null;

    // Clear previous tracking data on reload
    this.clearAllTrackingData();
  }

  // Generate unique session ID
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Initialize live heatmap overlay on page
  initializeLiveHeatmap() {
    // Create heatmap container div
    if (!this.heatmapContainer) {
      this.heatmapContainer = document.createElement('div');
      this.heatmapContainer.id = 'live-heatmap-container';
      this.heatmapContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 9999;
        opacity: 0.8;
      `;
      document.body.appendChild(this.heatmapContainer);
    }

    // Initialize heatmap
    if (!this.heatmapInstance) {
      this.heatmapInstance = h337.create({
        container: this.heatmapContainer,
        radius: 30,
        maxOpacity: 0.8,
        minOpacity: 0.1,
        blur: 0.75,
        gradient: {
          '0.1': 'rgba(0, 0, 255, 0.6)',
          '0.3': 'rgba(0, 255, 255, 0.6)',
          '0.5': 'rgba(0, 255, 0, 0.7)',
          '0.7': 'rgba(255, 255, 0, 0.8)',
          '1.0': 'rgba(255, 0, 0, 0.9)'
        }
      });
      console.log('🔥 Live heatmap initialized');
    }

    return this.heatmapInstance;
  }

  // Toggle heatmap visibility
  toggleHeatmapVisibility(visible = true) {
    if (this.heatmapContainer) {
      this.heatmapContainer.style.display = visible ? 'block' : 'none';
      console.log('👁️ Heatmap visibility:', visible ? 'ON' : 'OFF');
    }
  }

  // Update live heatmap with current interactions
  updateLiveHeatmap() {
    if (this.heatmapInstance && this.interactions.length > 0) {
      const heatmapData = {
        max: 5,
        data: this.interactions.filter(i => ['click', 'move'].includes(i.type))
      };
      this.heatmapInstance.setData(heatmapData);
    }
  }

  // Get current interaction stats
  getInteractionStats() {
    return {
      totalInteractions: this.interactions.length,
      clickCount: this.clickCount,
      moveCount: this.moveCount
    };
  }

  // Reset current session heatmap
  resetLiveHeatmap() {
    this.interactions = [];
    this.moveCount = 0;
    this.clickCount = 0;
    if (this.heatmapInstance) {
      this.heatmapInstance.setData({ max: 5, data: [] });
    }
    console.log('🔄 Live heatmap reset');
  }

  // Get device information
  getDeviceInfo() {
    const result = this.parser.getResult();
    return {
      browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
      os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
      device: result.device.type || 'desktop',
      deviceModel: result.device.model || null,
      deviceVendor: result.device.vendor || null,
      cpu: result.cpu.architecture || null,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      userAgent: navigator.userAgent
    };
  }

  // Get user information
  getUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return {
      userId: user?._id || 'guest',
      userRole: user?.role || 'guest',
      tenantId: user?.tenant_id || null,
      userEmail: user?.email || null,
      isAuthenticated: !!user
    };
  }

  // Track page visit and capture screenshot
  trackPageVisit(pagePath) {
    this.currentPage = pagePath;
    this.startTime = Date.now();

    const visitData = {
      sessionId: this.sessionId,
      eventType: 'page_visit',
      page: pagePath,
      timestamp: new Date().toISOString(),
      device: this.getDeviceInfo(),
      user: this.getUserInfo(),
      referrer: document.referrer || null,
      url: window.location.href
    };

    // Save visitor information to localStorage
    this.saveVisitorInfo(visitData);

    // Auto-capture screenshot for admin dashboard
    this.autoCapturePage(pagePath);

    this.sendTrackingData(visitData);
  }

  // Auto-capture page screenshot for admin viewing
  async autoCapturePage(pagePath) {
    try {
      console.log('📸 Auto-capturing page for admin dashboard:', pagePath);
      // Dynamically import screenshot service to avoid circular dependency
      const { default: screenshotService } = await import('./screenshotService');
      await screenshotService.captureViewportOnLoad(pagePath);
      console.log('✅ Page screenshot captured for admin dashboard');
    } catch (error) {
      console.warn('Failed to capture page screenshot:', error);
    }
  }

  // Save visitor information to MongoDB
  async saveVisitorInfo(visitData) {
    try {
      const visitorInfo = {
        sessionId: visitData.sessionId,
        page: visitData.page,
        url: visitData.url,
        timestamp: visitData.timestamp,
        device: visitData.device,
        user: visitData.user,
        referrer: visitData.referrer
      };

      await api.post('/api/heatmap/track-visitor', visitorInfo);
      console.log('✅ Visitor info saved to database:', visitorInfo);
    } catch (error) {
      console.warn('Failed to save visitor info to database:', error);
      // Fallback to localStorage
      this.saveVisitorInfoFallback(visitData);
    }
  }

  // Fallback method to save visitor info to localStorage
  saveVisitorInfoFallback(visitData) {
    try {
      const visitorKey = `visitor_${this.sessionId}_${Date.now()}`;
      const visitorInfo = {
        sessionId: visitData.sessionId,
        page: visitData.page,
        url: visitData.url,
        timestamp: visitData.timestamp,
        device: visitData.device,
        user: visitData.user,
        referrer: visitData.referrer,
        ip: 'N/A',
        duration: null
      };

      localStorage.setItem(visitorKey, JSON.stringify(visitorInfo));
      console.log('💾 Saved visitor info to localStorage as fallback:', visitorInfo);
    } catch (error) {
      console.warn('Failed to save visitor info fallback:', error);
    }
  }

  // Track page exit
  trackPageExit() {
    if (this.currentPage) {
      const exitData = {
        sessionId: this.sessionId,
        eventType: 'page_exit',
        page: this.currentPage,
        timestamp: new Date().toISOString(),
        timeSpent: Date.now() - this.startTime,
        device: this.getDeviceInfo(),
        user: this.getUserInfo()
      };

      this.sendTrackingData(exitData);
    }
  }

  // Start click tracking
  startClickTracking() {
    if (this.isTracking) return;

    this.isTracking = true;
    document.addEventListener('click', this.handleClick.bind(this), true);
    document.addEventListener('mousemove', this.handleMouseMove.bind(this), true);
    document.addEventListener('scroll', this.handleScroll.bind(this), true);
  }

  // Stop click tracking
  stopClickTracking() {
    this.isTracking = false;
    document.removeEventListener('click', this.handleClick.bind(this), true);
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this), true);
    document.removeEventListener('scroll', this.handleScroll.bind(this), true);
  }

  // Handle click events
  async handleClick(event) {
    const clickData = {
      sessionId: this.sessionId,
      eventType: 'click',
      page: this.currentPage,
      timestamp: new Date().toISOString(),
      position: {
        x: event.clientX,
        y: event.clientY,
        pageX: event.pageX,
        pageY: event.pageY
      },
      element: {
        tagName: event.target.tagName,
        id: event.target.id || null,
        className: event.target.className || null,
        innerText: event.target.innerText?.substring(0, 100) || null
      },
      device: this.getDeviceInfo(),
      user: this.getUserInfo()
    };

    // Add to interactions array for real-time heatmap
    this.interactions.push({
      x: event.clientX,
      y: event.clientY,
      type: 'click',
      value: 5
    });
    this.clickCount++;

    // Update live heatmap immediately
    this.updateLiveHeatmap();

    this.trackingData.push(clickData);

    // Save to database for persistence
    const heatmapPoint = {
      x: event.pageX,
      y: event.pageY,
      value: 5
    };
    await this.saveHeatmapData(this.currentPage, heatmapPoint);

    this.sendTrackingData(clickData);
  }

  // Handle mouse move events (throttled)
  handleMouseMove = this.throttle((event) => {
    const moveData = {
      sessionId: this.sessionId,
      eventType: 'mouse_move',
      page: this.currentPage,
      timestamp: new Date().toISOString(),
      position: {
        x: event.clientX,
        y: event.clientY
      },
      user: this.getUserInfo()
    };

    // Add to interactions array for real-time heatmap
    this.interactions.push({
      x: event.clientX,
      y: event.clientY,
      type: 'move',
      value: 1
    });
    this.moveCount++;

    // Update live heatmap immediately
    this.updateLiveHeatmap();

    // Save to database occasionally (every 10th mouse move)
    if (Math.random() < 0.1) {
      const heatmapPoint = {
        x: event.pageX,
        y: event.pageY,
        value: 1
      };
       this.saveHeatmapData(this.currentPage, heatmapPoint);
      this.sendTrackingData(moveData);
    }
  }, 100);

  // Handle scroll events
  handleScroll = this.throttle(() => {
    const scrollData = {
      sessionId: this.sessionId,
      eventType: 'scroll',
      page: this.currentPage,
      timestamp: new Date().toISOString(),
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      },
      user: this.getUserInfo()
    };

    this.sendTrackingData(scrollData);
  }, 500);

  // Add point to heatmap
  addHeatmapPoint(x, y, value = 1) {
    if (this.heatmapInstance) {
      this.heatmapInstance.addData({
        x: x,
        y: y,
        value: value
      });
    }
  }

  // Send tracking data to backend
  async sendTrackingData(data) {
    try {
      console.log('Sending tracking data:', data);
      const response = await api.post('/api/analytics/track', data);
      console.log('Tracking data sent successfully:', response.status);
      return response;
    } catch (error) {
      console.warn('Failed to send tracking data:', error.response?.status, error.response?.data, error);
      // Store failed requests for retry
      const failedRequests = JSON.parse(localStorage.getItem('failedTrackingData') || '[]');
      failedRequests.push(data);
      localStorage.setItem('failedTrackingData', JSON.stringify(failedRequests));
      throw error;
    }
  }

  // Retry failed tracking requests
  async retryFailedRequests() {
    const failedRequests = JSON.parse(localStorage.getItem('failedTrackingData') || '[]');
    if (failedRequests.length === 0) return;

    for (const data of failedRequests) {
      try {
        await api.post('/analytics/track', data);
      } catch (error) {
        console.warn('Retry failed for tracking data:', error);
        return; // Stop retrying if still failing
      }
    }

    localStorage.removeItem('failedTrackingData');
  }

  // Load heatmap data from MongoDB database
  async loadHeatmapData(page, dateRange = null) {
    try {
      const params = { page };
      if (dateRange) {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      }

      const response = await api.get('/api/heatmap/data', { params });
      return response.data;
    } catch (error) {
      console.warn('Failed to load heatmap data from database:', error);

      // Check if we have localStorage data to migrate
      const localData = this.getLocalHeatmapData(page);
      if (localData && localData.length > 0) {
        console.log('📦 Found localStorage data, attempting migration...');
        await this.migrateLocalStorageData();

        // Try loading from database again after migration
        try {
          const retryResponse = await api.get('/api/heatmap/data', {  });
          return retryResponse.data;
        } catch (retryError) {
          console.warn('Migration completed but still failed to load from database:', retryError);
        }
      }

      return {
        data: [],
        max: 1,
        message: 'No user interactions recorded yet. Visit this page, move your mouse and click around, then refresh the heatmap.'
      };
    }
  }

  // Get local heatmap data from localStorage
  getLocalHeatmapData(page) {
    try {
      const stored = localStorage.getItem(`heatmap_data_${page}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load local heatmap data:', error);
      return [];
    }
  }

  // Save heatmap data to MongoDB database
  async saveHeatmapData(page, data) {
    try {
      const heatmapPoint = {
        sessionId: this.sessionId,
        userId: this.getUserInfo().userId,
        page: page,
        url: window.location.href,
        eventType: data.value > 3 ? 'click' : 'move',
        position: {
          x: data.x,
          y: data.y,
          pageX: data.x,
          pageY: data.y
        },
        value: data.value,
        device: this.getDeviceInfo(),
        user: this.getUserInfo(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        timestamp: new Date().toISOString()
      };

      await api.post('/api/heatmap/track-interaction', heatmapPoint);
      console.log('✅ Heatmap point saved to database:', heatmapPoint);
    } catch (error) {
      console.warn('Failed to save heatmap data to database:', error);
      // Fallback to localStorage for retry later
      this.saveLocalHeatmapDataFallback(page, data);
    }
  }

  // Fallback method to save to localStorage when database is unavailable
  saveLocalHeatmapDataFallback(page, data) {
    try {
      const existing = this.getLocalHeatmapData(page);
      existing.push(data);

      // Keep only last 1000 points to avoid storage bloat
      const trimmed = existing.slice(-1000);
      localStorage.setItem(`heatmap_data_${page}`, JSON.stringify(trimmed));
      console.log('💾 Saved to localStorage as fallback:', trimmed.length, 'points for', page);
    } catch (error) {
      console.warn('Failed to save local heatmap data fallback:', error);
    }
  }

  // Migrate localStorage data to MongoDB
  async migrateLocalStorageData() {
    try {
      console.log('📦 Starting migration from localStorage to MongoDB...');

      // Collect heatmap data
      const heatmapData = {};
      const visitorData = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('heatmap_data_')) {
          const page = key.replace('heatmap_data_', '');
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          if (data.length > 0) {
            heatmapData[page] = data;
          }
        } else if (key && key.startsWith('visitor_')) {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.sessionId) {
            visitorData.push(data);
          }
        }
      }

      if (Object.keys(heatmapData).length > 0 || visitorData.length > 0) {
        const response = await api.post('/api/heatmap/migrate-localstorage', {
          heatmapData,
          visitorData,
          tenantId: this.getUserInfo().tenantId
        });

        if (response.data.success) {
          console.log(`✅ Migration successful: ${response.data.migratedCount} records`);
          // Clear localStorage after successful migration
          this.clearAllTrackingData();
          return true;
        }
      } else {
        console.log('📦 No localStorage data found to migrate');
        return true;
      }
    } catch (error) {
      console.warn('Failed to migrate localStorage data:', error);
      return false;
    }
  }

  // Clear all tracking data from localStorage but keep visitor data
  clearAllTrackingData() {
    try {
      console.log('🗑️ Clearing localStorage tracking data...');
      const keysToRemove = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('heatmap_data_') || key.startsWith('visitor_'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`✅ Cleared ${keysToRemove.length} localStorage tracking entries`);
    } catch (error) {
      console.warn('Failed to clear tracking data:', error);
    }
  }

  // Display heatmap from server data
  async displayHeatmap(page, container = null, dateRange = null) {
    const heatmapData = await this.loadHeatmapData(page, dateRange);
    if (!heatmapData || !heatmapData.data) return;

    this.initializeHeatmap(container);
    this.heatmapInstance.setData(heatmapData);
  }

  // Utility function for throttling
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Clean up
  destroy() {
    this.stopClickTracking();
    this.trackPageExit();
    if (this.heatmapInstance) {
      this.heatmapInstance = null;
    }
  }
}

// Create singleton instance
const heatmapService = new HeatmapService();

// Track page unload
window.addEventListener('beforeunload', () => {
  heatmapService.trackPageExit();
});

export default heatmapService;