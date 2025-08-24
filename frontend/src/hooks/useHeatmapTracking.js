import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import heatmapService from '../services/heatmapService';

export const useHeatmapTracking = (options = {}) => {
  const location = useLocation();
  const heatmapRef = useRef(null);
  const { 
    enableClicks = true, 
    enableMouse = true, 
    autoStart = true,
    container = null 
  } = options;

  useEffect(() => {
    if (autoStart) {
      // Track page visit and auto-capture screenshot
      heatmapService.trackPageVisit(location.pathname);
      
      // Start tracking interactions for admin dashboard analysis
      if (enableClicks || enableMouse) {
        heatmapService.startClickTracking();
      }

      // Retry any failed requests
      heatmapService.retryFailedRequests();
    }

    // Cleanup on unmount or location change
    return () => {
      heatmapService.trackPageExit();
      if (!autoStart) {
        heatmapService.stopClickTracking();
      }
    };
  }, [location.pathname, autoStart, enableClicks, enableMouse, container]);

  // Return functions for manual control
  return {
    startTracking: () => heatmapService.startClickTracking(),
    stopTracking: () => heatmapService.stopClickTracking(),
    trackPageVisit: (page) => heatmapService.trackPageVisit(page),
    trackPageExit: () => heatmapService.trackPageExit(),
    displayHeatmap: (page, dateRange) => heatmapService.displayHeatmap(page, heatmapRef.current, dateRange),
    heatmapRef,
    heatmapService
  };
};