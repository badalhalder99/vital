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
    this.currentGuestId = null; // Will be set when needed
    this.lastInteractionTime = 0; // Track last interaction time (mouse, click, scroll)
    this.interactionGapDelay = 300000; // 5 minutes in milliseconds
    this.lastIncrementTime = 0; // Prevent double increments
    // Simple rule: page reload = +1 visit, 5+ min gap = +1 visit

    // Current session tracking
    this.currentSession = {
      startTime: Date.now(),
      endTime: null,
      clickCount: 0,
      moveCount: 0,
      scrollCount: 0,
      interactions: [], // Store interaction locations
      pages: [] // Pages visited in this session
    };

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

  // Generate stable device fingerprint for guest user identification
  generateDeviceFingerprint() {
    // Use only the most stable properties that won't change
    const stableFingerprint = {
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      colorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language.split('-')[0], // Just 'en' not 'en-US'
      platform: navigator.platform,
      userAgent: navigator.userAgent.replace(/Chrome\/[\d\.]+/g, 'Chrome').replace(/Firefox\/[\d\.]+/g, 'Firefox') // Remove version numbers
    };

    // Sort keys to ensure consistent ordering
    const sortedKeys = Object.keys(stableFingerprint).sort();
    const sortedFingerprint = {};
    sortedKeys.forEach(key => {
      sortedFingerprint[key] = stableFingerprint[key];
    });

    // Create a simple hash of the fingerprint
    const fingerprintString = JSON.stringify(sortedFingerprint);
    let hash = 5381; // Use djb2 hash algorithm for better consistency
    for (let i = 0; i < fingerprintString.length; i++) {
      hash = ((hash << 5) + hash) + fingerprintString.charCodeAt(i);
    }

    const hashString = Math.abs(hash).toString(36).substring(0, 8); // Consistent length
    // console.log('🔍 Stable fingerprint:', {
    //   data: sortedFingerprint,
    //   string: fingerprintString,
    //   hash: hashString
    // });

    return {
      hash: hashString,
      details: sortedFingerprint
    };
  }

  // Get or create guest user info with fingerprinting (increment based on interaction gaps)
  getGuestUserInfo(isInteraction = false, forceIncrement = false) {
    const fingerprint = this.generateDeviceFingerprint();

    // First check if we have a persistent guest ID stored
    const persistentKey = 'persistent_guest_id';
    let persistentGuestId = localStorage.getItem(persistentKey);

    // If no persistent ID exists, create one based on fingerprint
    if (!persistentGuestId) {
      persistentGuestId = `guest_${fingerprint.hash}`;
      localStorage.setItem(persistentKey, persistentGuestId);
      console.log('🆕 Created persistent guest ID:', persistentGuestId);
    }

    // Use the persistent ID as the guest key (not the current fingerprint)
    const guestKey = `guest_fingerprint_${persistentGuestId.replace('guest_', '')}`;

    // Check if we've seen this device/browser combination before
    let guestInfo = JSON.parse(localStorage.getItem(guestKey) || 'null');
    const now = Date.now();

    // Clean up old format guest IDs that have timestamps
    if (guestInfo && guestInfo.guestId && guestInfo.guestId.includes('_') && guestInfo.guestId.match(/_\d+$/)) {
      console.log('🧹 Cleaning up old guest ID format:', guestInfo.guestId);
      guestInfo.guestId = persistentGuestId; // Use persistent ID
      localStorage.setItem(guestKey, JSON.stringify(guestInfo));
    }

    if (!guestInfo) {
      // This is a new guest user - use the persistent guest ID
      guestInfo = {
        guestId: persistentGuestId,
        fingerprint: fingerprint,
        firstVisit: new Date().toISOString(),
        visitCount: 1, // First visit
        returnVisits: [], // Will store detailed session data
        lastInteractionTime: now,
        currentSessionStart: now,
        totalTimeSpent: 0 // in milliseconds
      };

      // Initialize current session for first visit
      this.currentSession = {
        visitNumber: 1,
        startTime: now,
        endTime: null,
        clickCount: 0,
        moveCount: 0,
        scrollCount: 0,
        interactions: [],
        pages: [this.currentPage || '/']
      };

      localStorage.setItem(guestKey, JSON.stringify(guestInfo));
      console.log('🆕 New guest user detected:', guestInfo.guestId, 'Visit count: 1');
    } else {
      // Update session start time for current session
      if (!guestInfo.sessionStartTime || isInteraction || forceIncrement) {
        guestInfo.sessionStartTime = now;
      }

      // Ensure sessions array exists
      if (!guestInfo.sessions) {
        guestInfo.sessions = [];
      }

      // Check if we should start a new visit/session
      const timeSinceLastInteraction = now - (guestInfo.lastInteractionTime || 0);
      const timeSinceLastVisitIncrement = now - this.lastVisitIncrementTime;

      // Increment visit count on:
      // 1. Page reload (forceIncrement=true) OR
      // 2. 5+ minute gap between interactions
      // Prevent double increments within 2 seconds
      const timeSinceLastIncrement = now - this.lastIncrementTime;
      const shouldStartNewVisit = (forceIncrement || (isInteraction && timeSinceLastInteraction > this.interactionGapDelay)) && timeSinceLastIncrement > 2000;

      if (shouldStartNewVisit && this.currentSession.startTime) {
        this.lastIncrementTime = now;
        // End current session and get its data
        const sessionResult = this.endCurrentSession();

        if (sessionResult) {
          // Add completed session to returnVisits (this was the previous visit)
          if (!guestInfo.returnVisits) {
            guestInfo.returnVisits = [];
          }
          guestInfo.returnVisits.push(sessionResult.sessionArray);

          // Update total time spent
          guestInfo.totalTimeSpent = (guestInfo.totalTimeSpent || 0) + sessionResult.sessionDuration;
        }

        // Increment visit count (starting new visit)
        if (!window.incrementCounter) window.incrementCounter = 0;
        window.incrementCounter++;
        console.log(`🚨 INCREMENT #${window.incrementCounter}: ${guestInfo.visitCount} -> ${guestInfo.visitCount + 1}`);
        guestInfo.visitCount += 1;
        guestInfo.currentSessionStart = now;

        // Start new session
        this.currentSession = {
          visitNumber: guestInfo.visitCount,
          startTime: now,
          endTime: null,
          clickCount: 0,
          moveCount: 0,
          scrollCount: 0,
          interactions: [],
          pages: [this.currentPage || '/']
        };
    this.lastPageVisitCall = 0;

        const reason = forceIncrement ? 'page reload' : `${Math.round(timeSinceLastInteraction / 60000)} min gap`;
        console.log(`📍 Visit #${guestInfo.visitCount} (${reason})`);

        // Store updated visit count in database
        this.saveVisitCountToDatabase(guestInfo);
      } else {
        // Continue current session, just add current page if not already there
        if (this.currentPage && !this.currentSession.pages.includes(this.currentPage)) {
          this.currentSession.pages.push(this.currentPage);
        }
      }

      // Always update last interaction time if it's an interaction
      if (isInteraction || forceIncrement) {
        guestInfo.lastInteractionTime = now;
        localStorage.setItem(guestKey, JSON.stringify(guestInfo));
      }
    }

    this.currentGuestId = guestInfo.guestId;
    return guestInfo;
  }

  // Get user information (with interaction tracking)
  getUserInfo(isInteraction = false, forceIncrement = false) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    // If user is authenticated, use their actual info
    if (user && user._id) {
      return {
        userId: user._id,
        userRole: user.role || 'user',
        tenantId: user.tenant_id || null,
        userEmail: user.email || null,
        isAuthenticated: true,
        guestInfo: null
      };
    }

    // For guest users, use fingerprint-based identification
    const guestInfo = this.getGuestUserInfo(isInteraction, forceIncrement);

    // Calculate current session duration
    const currentSessionDuration = guestInfo.currentSessionStart ?
      Date.now() - guestInfo.currentSessionStart : 0;

    return {
      userId: guestInfo.guestId,
      userRole: 'guest',
      tenantId: null,
      userEmail: null,
      isAuthenticated: false,
      guestInfo: {
        fingerprint: guestInfo.fingerprint.hash,
        visitCount: guestInfo.visitCount,
        firstVisit: guestInfo.firstVisit,
        returnVisits: guestInfo.returnVisits || [], // Array of arrays: [[startTime, endTime, interactionCount, details], ...]
        isReturning: guestInfo.visitCount > 1,
        currentSessionDuration: currentSessionDuration,
        totalTimeSpent: guestInfo.totalTimeSpent || 0,
        currentSession: {
          visitNumber: this.currentSession.visitNumber || guestInfo.visitCount,
          startTime: new Date(this.currentSession.startTime).toISOString(),
          clickCount: this.currentSession.clickCount,
          moveCount: this.currentSession.moveCount,
          scrollCount: this.currentSession.scrollCount,
          totalInteractions: this.currentSession.clickCount + this.currentSession.moveCount + this.currentSession.scrollCount,
          pages: this.currentSession.pages
        }
      }
    };
  }

  // End current session and prepare data for returnVisits (but don't add yet)
  endCurrentSession() {
    if (this.currentSession && this.currentSession.startTime) {
      // Calculate session duration
      const now = Date.now();
      const sessionDuration = now - this.currentSession.startTime;
      const totalInteractions = this.currentSession.clickCount + this.currentSession.moveCount + this.currentSession.scrollCount;

      // Create session data as array: [startTime, endTime, interactionCount, interactionDetails]
      const sessionArray = [
        new Date(this.currentSession.startTime).toISOString(), // Start time
        new Date(now).toISOString(), // End time
        totalInteractions, // Total interaction count
        {
          clickCount: this.currentSession.clickCount,
          moveCount: this.currentSession.moveCount,
          scrollCount: this.currentSession.scrollCount,
          interactions: this.currentSession.interactions.slice(), // Interaction locations/details
          pages: this.currentSession.pages.slice(), // Pages visited
          duration: sessionDuration // Session duration in ms
        }
      ];

      console.log('⏱️ Session ended:', {
        duration: Math.round(sessionDuration / 1000) + 's',
        interactions: totalInteractions
      });

      return { sessionArray, sessionDuration };
    }
    return null;
  }

  // Clear guest user data (for testing or reset purposes)
  clearGuestData() {
    const keys = Object.keys(localStorage);
    let clearedCount = 0;
    keys.forEach(key => {
      if (key.startsWith('guest_fingerprint_') || key === 'persistent_guest_id') {
        localStorage.removeItem(key);
        clearedCount++;
        console.log('🗑️ Removed:', key);
      }
    });
    this.currentGuestId = null;
    // Reset current session
    this.currentSession = {
      startTime: Date.now(),
      endTime: null,
      clickCount: 0,
      moveCount: 0,
      scrollCount: 0,
      interactions: [],
      pages: []
    };
    this.lastVisitIncrementTime = 0;
    this.hasIncrementedThisSession = false;
    this.lastPageVisitCall = 0;
    console.log(`🧼 Cleared ${clearedCount} guest user data entries`);
  }

  // Reset corrupted guest data and start fresh
  resetCorruptedGuestData() {
    console.log('🔄 Resetting guest data...');
    this.clearGuestData();

    // Reset session tracking variables
    this.lastInteractionTime = 0;
    this.lastVisitIncrementTime = 0;
    this.hasIncrementedThisSession = false;
    this.lastPageVisitCall = 0;
    this.lastPageVisitCall = 0;
    this.sessionId = this.generateSessionId();

    console.log('✅ Guest data reset complete - visit count will increment on 5+ min gaps or page reloads');
  }

  // Save visit count update to database
  async saveVisitCountToDatabase(guestInfo) {
    try {
      const guestVisitData = {
        guestId: guestInfo.guestId,
        fingerprint: guestInfo.fingerprint.hash,
        visitCount: guestInfo.visitCount,
        isReturning: guestInfo.visitCount > 1,
        returnVisits: guestInfo.returnVisits || [],
        sessionId: this.sessionId,
        page: this.currentPage || '/',
        url: window.location.href,
        device: this.getDeviceInfo(),
        tenantId: null
      };

      await api.post('/api/heatmap/track-guest-visit', guestVisitData);
      console.log(`💾 Visit count ${guestInfo.visitCount} stored in database:`, guestInfo.guestId);
    } catch (error) {
      console.warn('Failed to store visit count in database:', error);
    }
  }

  // Track guest user visit to backend
  async trackGuestVisit(userInfo, pagePath) {
    if (!userInfo.guestInfo) return;

    try {
      const guestVisitData = {
        guestId: userInfo.userId,
        fingerprint: userInfo.guestInfo.fingerprint,
        visitCount: userInfo.guestInfo.visitCount,
        isReturning: userInfo.guestInfo.isReturning,
        returnVisits: userInfo.guestInfo.returnVisits,
        sessionId: this.sessionId,
        page: pagePath,
        url: window.location.href,
        device: this.getDeviceInfo(),
        tenantId: null
      };

      await api.post('/api/heatmap/track-guest-visit', guestVisitData);
      console.log(`✓ Guest visit tracked:`, {
        guestId: userInfo.userId,
        visitCount: userInfo.guestInfo.visitCount,
        isReturning: userInfo.guestInfo.isReturning
      });
    } catch (error) {
      console.warn('Failed to track guest visit:', error);
    }
  }

  // Track page visit and capture screenshot (force increment on page reload)
  trackPageVisit(pagePath) {
    const now = Date.now();

    // Debounce multiple trackPageVisit calls within 2 seconds
    if (!this.lastPageVisitCall) this.lastPageVisitCall = 0;
    const timeSinceLastPageVisit = now - this.lastPageVisitCall;
    if (timeSinceLastPageVisit < 2000) {
      console.log(`🚫 BLOCKED duplicate trackPageVisit for ${pagePath}`);
      return;
    }

    this.lastPageVisitCall = now;
    console.log(`✅ ALLOWING trackPageVisit for ${pagePath}`);
    this.currentPage = pagePath;
    this.startTime = now;
    this.lastInteractionTime = now;

    // Get user info and force increment visit count for page visits (reloads)
    const userInfo = this.getUserInfo(false, true); // forceIncrement = true for page visits

    const visitData = {
      sessionId: this.sessionId,
      eventType: 'page_visit',
      page: pagePath,
      timestamp: new Date().toISOString(),
      device: this.getDeviceInfo(),
      user: userInfo,
      referrer: document.referrer || null,
      url: window.location.href
    };

    // Track guest user visit with enhanced data if it's a guest
    if (!userInfo.isAuthenticated) {
      this.trackGuestVisit(userInfo, pagePath);
    }

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

  // End current guest session on page exit (don't add to returnVisits yet)
  endGuestSession() {
    const userInfo = this.getUserInfo(false, false);
    if (!userInfo.isAuthenticated && userInfo.guestInfo) {
      // Just end the current session timing, but don't move to returnVisits
      // That will happen when they return and start a new visit
      if (this.currentSession && this.currentSession.startTime) {
        console.log('⏱️ Guest session ending for:', userInfo.guestInfo.fingerprint);
      }
    }
  }

  // Track page exit
  trackPageExit() {
    if (this.currentPage) {
      // End guest session before tracking exit
      this.endGuestSession();

      const exitData = {
        sessionId: this.sessionId,
        eventType: 'page_exit',
        page: this.currentPage,
        timestamp: new Date().toISOString(),
        timeSpent: Date.now() - this.startTime,
        device: this.getDeviceInfo(),
        user: this.getUserInfo(false, false)
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
    // Track click as interaction (may increment if 5+ min gap)
    const userInfo = this.getUserInfo(true, false); // isInteraction = true to check for 5+ min gap

    // Track interaction in current session
    this.currentSession.clickCount++;
    this.currentSession.interactions.push({
      type: 'click',
      timestamp: new Date().toISOString(),
      x: event.clientX,
      y: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY,
      element: {
        tagName: event.target.tagName,
        id: event.target.id || null,
        className: event.target.className || null,
        innerText: event.target.innerText?.substring(0, 100) || null
      },
      page: this.currentPage
    });

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
      user: userInfo
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
    // Track mouse move as interaction (may increment if 5+ min gap)
    const userInfo = this.getUserInfo(true, false); // isInteraction = true to check for 5+ min gap

    // Track interaction in current session (sample to avoid too many entries)
    if (Math.random() < 0.1) { // Sample 10% of mouse moves
      this.currentSession.moveCount++;
      this.currentSession.interactions.push({
        type: 'move',
        timestamp: new Date().toISOString(),
        x: event.clientX,
        y: event.clientY,
        page: this.currentPage
      });
    }

    const moveData = {
      sessionId: this.sessionId,
      eventType: 'mouse_move',
      page: this.currentPage,
      timestamp: new Date().toISOString(),
      position: {
        x: event.clientX,
        y: event.clientY
      },
      user: userInfo
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
    // Track scroll as interaction (may increment if 5+ min gap)
    const userInfo = this.getUserInfo(true, false); // isInteraction = true to check for 5+ min gap

    // Track interaction in current session
    this.currentSession.scrollCount++;
    this.currentSession.interactions.push({
      type: 'scroll',
      timestamp: new Date().toISOString(),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      page: this.currentPage
    });

    const scrollData = {
      sessionId: this.sessionId,
      eventType: 'scroll',
      page: this.currentPage,
      timestamp: new Date().toISOString(),
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      },
      user: userInfo
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
        userId: this.getUserInfo(false).userId,
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
        user: this.getUserInfo(false, false),
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
          tenantId: this.getUserInfo(false, false).tenantId
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

  // Clear all tracking data from localStorage but preserve guest user info
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

  // Clear all heatmap data from MongoDB database
  async clearAllDatabaseData(tenantId = null) {
    try {
      console.log('🗑️ Clearing all heatmap data from MongoDB...');

      const response = await api.delete('/api/heatmap/clear-all-data', {
        data: {
          tenantId: tenantId,
          confirm: 'DELETE_ALL_HEATMAP_DATA'
        }
      });

      if (response.data.success) {
        console.log(`✅ Cleared ${response.data.deletedCount} records from database`);
        return {
          success: true,
          deletedCount: response.data.deletedCount,
          message: response.data.message
        };
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Failed to clear database data:', error);
      throw new Error(error.response?.data?.message || 'Failed to clear database data');
    }
  }

  // Get total count of heatmap records in database
  async getDatabaseDataCount(tenantId = null) {
    try {
      const response = await api.get('/api/heatmap/data-count', {
        params: { tenantId: tenantId }
      });

      if (response.data.success) {
        return {
          success: true,
          count: response.data.count,
          message: response.data.message
        };
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.warn('Failed to get database data count:', error);
      return {
        success: false,
        count: 0,
        message: 'Unable to retrieve database count'
      };
    }
  }

  // Complete data reset - both localStorage and MongoDB
  async resetAllHeatmapData(tenantId = null) {
    try {
      console.log('🔄 Starting complete heatmap data reset...');

      // Get current counts before clearing
      const dbCount = await this.getDatabaseDataCount(tenantId);
      const localCount = this.getLocalDataCount();

      console.log(`📊 Before reset - Database: ${dbCount.count} records, LocalStorage: ${localCount} records`);

      // Clear database data
      const dbResult = await this.clearAllDatabaseData(tenantId);

      // Clear localStorage data
      this.clearAllTrackingData();

      // Clear guest data
      this.clearGuestData();

      console.log('✅ Complete data reset successful');

      return {
        success: true,
        database: dbResult,
        localStorage: { cleared: localCount },
        message: `Reset complete! Cleared ${dbResult.deletedCount} database records and ${localCount} localStorage entries`
      };
    } catch (error) {
      console.error('Complete data reset failed:', error);
      throw error;
    }
  }

  // Get count of localStorage data entries
  getLocalDataCount() {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('heatmap_data_') || key.startsWith('visitor_') || key.startsWith('guest_fingerprint_'))) {
        count++;
      }
    }
    return count;
  }

  // Reset guest session (call this when starting a completely new session)
  resetGuestSession() {
    try {
      this.currentGuestId = null;
      console.log('🔄 Guest session reset - new guest ID will be generated on next interaction');
    } catch (error) {
      console.warn('Failed to reset guest session:', error);
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