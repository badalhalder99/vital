import React, { useState, useEffect } from 'react';
import { useHeatmapTracking } from '../hooks/useHeatmapTracking';
import HeatmapViewer from './HeatmapViewer';

const HeatmapDemo = () => {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isTracking, setIsTracking] = useState(true);
  const [trackingData, setTrackingData] = useState({
    clicks: 0,
    moves: 0,
    scrolls: 0
  });

  const { 
    startTracking, 
    stopTracking, 
    heatmapRef,
    heatmapService 
  } = useHeatmapTracking({
    enableClicks: isTracking,
    enableMouse: isTracking,
    autoStart: isTracking
  });

  useEffect(() => {
    // Simulate tracking data updates
    const interval = setInterval(() => {
      setTrackingData(prev => ({
        clicks: prev.clicks + Math.floor(Math.random() * 2),
        moves: prev.moves + Math.floor(Math.random() * 5),
        scrolls: prev.scrolls + Math.floor(Math.random() * 1)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
    setIsTracking(!isTracking);
  };

  const handleTestClick = (e) => {
    // This will be automatically tracked by the heatmap service
    console.log('Test click recorded at:', e.clientX, e.clientY);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🔥 Heatmap Tracking Demo</h2>
      
      {/* Status Panel */}
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3>📊 Tracking Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: isTracking ? '#28a745' : '#dc3545' }}>
              {isTracking ? '🟢 Active' : '🔴 Stopped'}
            </div>
            <div>Tracking Status</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
              {trackingData.clicks}
            </div>
            <div>Clicks Tracked</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
              {trackingData.moves}
            </div>
            <div>Mouse Moves</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fd7e14' }}>
              {trackingData.scrolls}
            </div>
            <div>Scroll Events</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={toggleTracking}
          style={{
            padding: '10px 20px',
            backgroundColor: isTracking ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            marginRight: '10px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          {isTracking ? '⏸️ Stop Tracking' : '▶️ Start Tracking'}
        </button>
        
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          {showHeatmap ? '👁️ Hide Heatmap' : '🔥 Show Heatmap'}
        </button>
      </div>

      {/* Interactive Test Area */}
      <div style={{
        border: '2px dashed #007bff',
        borderRadius: '8px',
        padding: '30px',
        marginBottom: '20px',
        backgroundColor: '#f8f9fa',
        position: 'relative',
        minHeight: '200px'
      }}>
        <h3>🎯 Interactive Test Area</h3>
        <p>Click anywhere in this area to generate heatmap data. Mouse movements and scrolling are also being tracked.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginTop: '20px' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <button
              key={i}
              onClick={handleTestClick}
              style={{
                padding: '15px',
                backgroundColor: `hsl(${i * 45}, 70%, 60%)`,
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Click Me {i + 1}
            </button>
          ))}
        </div>

        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
          <h4>🔍 What's Being Tracked:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><strong>Page Visits:</strong> When you navigate to different pages</li>
            <li><strong>Click Events:</strong> Every click with position and target element</li>
            <li><strong>Mouse Movement:</strong> Mouse position tracking (throttled for performance)</li>
            <li><strong>Scroll Events:</strong> Scroll position tracking</li>
            <li><strong>Device Info:</strong> Browser, OS, screen resolution, device type</li>
            <li><strong>User Info:</strong> Authenticated user data or guest status</li>
            <li><strong>Timestamps:</strong> Precise timing for all events</li>
          </ul>
        </div>
      </div>

      {/* Heatmap Viewer */}
      {showHeatmap && (
        <div style={{ marginTop: '20px' }}>
          <h3>🔥 Live Heatmap Visualization</h3>
          <p>This shows the heatmap data for the current page based on user interactions:</p>
          <HeatmapViewer 
            page={window.location.pathname}
            className="demo-heatmap"
          />
        </div>
      )}

      {/* Integration Info */}
      <div style={{
        backgroundColor: '#d1ecf1',
        border: '1px solid #bee5eb',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '20px'
      }}>
        <h3>📋 Integration Points</h3>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p><strong>Automatic Integration:</strong></p>
          <ul>
            <li><code>App.js</code> - Heatmap tracking is automatically initialized for all pages</li>
            <li><code>useHeatmapTracking</code> hook is active on every page navigation</li>
            <li>All user interactions are sent to <code>/api/analytics/track</code> endpoint</li>
          </ul>
          
          <p><strong>Manual Integration:</strong></p>
          <ul>
            <li>Analytics Dashboard: <code>/dashboard</code> → Analytics tab</li>
            <li>HeatmapViewer component: Available for custom implementations</li>
            <li>heatmapService: Direct API for advanced tracking needs</li>
          </ul>

          <p><strong>Data Storage:</strong></p>
          <ul>
            <li>MongoDB: Real-time analytics data with tenant isolation</li>
            <li>Local Storage: Failed requests retry mechanism</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HeatmapDemo;