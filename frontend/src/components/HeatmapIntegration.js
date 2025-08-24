import React, { useState, useEffect, useRef } from 'react';
import screenshotService from '../services/screenshotService';
import heatmapService from '../services/heatmapService';
import api from '../services/api';
import h337 from 'heatmapjs';

const HeatmapIntegration = () => {
  const [screenshots, setScreenshots] = useState([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visitorData, setVisitorData] = useState([]);
  const [dataCount, setDataCount] = useState({ database: 0, localStorage: 0 });
  const heatmapContainerRef = useRef(null);
  const heatmapInstanceRef = useRef(null);

  useEffect(() => {
    loadAllScreenshots();
    loadVisitorData();
    loadDataCount();

    // Migrate localStorage data to MongoDB on component mount
    const migrateData = async () => {
      try {
        await heatmapService.migrateLocalStorageData();
        // Refresh data count after migration
        loadDataCount();
      } catch (error) {
        console.warn('Migration failed:', error);
      }
    };
    migrateData();
  }, []);

  useEffect(() => {
    if (selectedScreenshot) {
      loadHeatmapForScreenshot();
    }
  }, [selectedScreenshot]);

  const loadAllScreenshots = () => {
    try {
      const allScreenshots = screenshotService.getAllScreenshots();
      setScreenshots(allScreenshots);

      if (allScreenshots.length > 0) {
        setSelectedScreenshot(allScreenshots[0]);
      }
    } catch (err) {
      console.error('Error loading screenshots:', err);
      setError('Failed to load screenshots');
    }
  };

  const loadVisitorData = async () => {
    try {
      console.log('👥 Loading visitor data from database...');

      // Try to get visitor data from our new heatmap API
      try {
        const visitorResponse = await api.get('/api/heatmap/visitors');

        if (visitorResponse.data.success && visitorResponse.data.data) {
          const visitors = visitorResponse.data.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setVisitorData(visitors);
          console.log('✅ Loaded visitor data from database:', visitors.length, 'visits');
          return;
        }
      } catch (apiError) {
        console.warn('Failed to load from heatmap API, trying localStorage:', apiError);
      }

      // Fallback to localStorage if API fails
      const visitors = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('visitor_')) {
          const visitorInfo = JSON.parse(localStorage.getItem(key));
          if (visitorInfo) {
            visitors.push(visitorInfo);
          }
        }
      }

      visitors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setVisitorData(visitors);
      console.log('📊 Loaded visitor data from localStorage fallback:', visitors.length, 'visits');
    } catch (err) {
      console.error('Error loading visitor data:', err);
    }
  };

  const loadDataCount = async () => {
    try {
      // Get database count
      const dbCount = await heatmapService.getDatabaseDataCount();
      
      // Get localStorage count
      const localCount = heatmapService.getLocalDataCount();
      
      setDataCount({
        database: dbCount.count,
        localStorage: localCount
      });
      
      console.log(`📊 Data counts - Database: ${dbCount.count}, LocalStorage: ${localCount}`);
    } catch (error) {
      console.warn('Failed to load data counts:', error);
      setDataCount({ database: 0, localStorage: 0 });
    }
  };

  const loadHeatmapForScreenshot = async () => {
    if (!selectedScreenshot) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading heatmap data for page:', selectedScreenshot.url);

      // Load heatmap data for the selected page
      const data = await heatmapService.loadHeatmapData(selectedScreenshot.url, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        end: new Date().toISOString().split('T')[0] // today
      });

      console.log('📊 Raw heatmap data received:', data);

      if (data && data.data && data.data.length > 0) {
        console.log('✅ Heatmap data found:', data.data.length, 'points');
        setHeatmapData(data);
        // Display heatmap immediately like HTML demo
        showGreenDots(data);
        setError(null);
      } else {
        console.log('❌ No heatmap data found for page:', selectedScreenshot.url);
        setHeatmapData(null);
        clearHeatmapOverlay();
        const message = data?.message || `No interactions found for ${selectedScreenshot.url}. Visit this page and interact with it first.`;
        setError(message);
      }
    } catch (err) {
      console.error('❌ Error loading heatmap data:', err);
      setError('Failed to load heatmap data for this page: ' + err.message);
    } finally {
      setLoading(false);
    }
  };


  const clearHeatmapOverlay = () => {
    if (heatmapInstanceRef.current) {
      heatmapInstanceRef.current.setData({ data: [], max: 0 });
    }
    // Also clear green dots
    if (heatmapContainerRef.current) {
      heatmapContainerRef.current.innerHTML = '';
    }
  };

  const showGreenDots = (data) => {
    if (!heatmapContainerRef.current || !selectedScreenshot || !data.data) {
      return;
    }

    console.log('🎯 Creating heatmap with', data.data.length, 'interaction points');

    // Get image dimensions for scaling
    const img = heatmapContainerRef.current.previousElementSibling;
    if (!img) {
      console.log('❌ Image not found for heatmap overlay');
      return;
    }

    const imgRect = img.getBoundingClientRect();
    const originalHeight = selectedScreenshot.fullPageHeight || selectedScreenshot.viewportHeight;
    const scaleX = imgRect.width / selectedScreenshot.viewportWidth;
    const scaleY = imgRect.height / originalHeight;

    console.log('📏 Scale factors:', { scaleX, scaleY, imgRect, originalHeight });

    // Clear and setup container - force absolute positioning
    heatmapContainerRef.current.innerHTML = '';
    heatmapContainerRef.current.style.width = `${imgRect.width}px`;
    heatmapContainerRef.current.style.height = `${imgRect.height}px`;
    heatmapContainerRef.current.style.position = 'absolute !important';
    heatmapContainerRef.current.style.top = '0px';
    heatmapContainerRef.current.style.left = '0px';
    heatmapContainerRef.current.style.pointerEvents = 'none';
    heatmapContainerRef.current.style.zIndex = '10';

    // Create heatmap instance - same config as HTML demo
    try {
      // Destroy previous instance if exists
      if (heatmapInstanceRef.current) {
        heatmapInstanceRef.current = null;
      }

      // Create new instance with simple config like HTML demo
      heatmapInstanceRef.current = h337.create({
        container: heatmapContainerRef.current,
        radius: 30, // Same as HTML demo
        maxOpacity: 0.8,
        minOpacity: 0.1,
        blur: 0.75,
        gradient: {
          '0.4': 'blue',
          '0.6': 'cyan',
          '0.7': 'lime',
          '0.8': 'yellow',
          '1.0': 'red'
        }
      });

      console.log('✅ Heatmap instance created');

      // Transform data to screenshot coordinates
      const transformedData = {
        max: 5, // Same as HTML demo
        data: data.data.map(point => ({
          x: Math.round(point.x * scaleX),
          y: Math.round(point.y * scaleY),
          value: point.value
        }))
      };

      console.log('🔥 Setting heatmap data:', transformedData);

      // Set heatmap data immediately - like HTML demo
      heatmapInstanceRef.current.setData(transformedData);

      // Force immediate render and absolute positioning
      setTimeout(() => {
        const canvas = heatmapContainerRef.current.querySelector('canvas');
        if (canvas) {
          console.log('✅ Heatmap canvas found and visible');
          canvas.style.display = 'block';
          canvas.style.opacity = '1';
          canvas.style.position = 'absolute';
          canvas.style.top = '0px';
          canvas.style.left = '0px';

          // Also ensure container stays absolute
          heatmapContainerRef.current.style.position = 'absolute';
          heatmapContainerRef.current.style.top = '0px';
          heatmapContainerRef.current.style.left = '0px';
        } else {
          console.log('❌ No heatmap canvas created');
        }
      }, 10);

      console.log(`✅ Heatmap created with ${transformedData.data.length} points`);

    } catch (error) {
      console.error('❌ Failed to create heatmap:', error);
    }
  };

  const captureNewScreenshot = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = window.prompt('Enter the URL path to capture (e.g., /, /dashboard, /about):') || '/';

      if (url) {
        // Navigate to capture the current page if it matches, or open in new tab
        if (window.location.pathname === url) {
          // Capture current page
          const screenshot = await screenshotService.captureViewportOnLoad(url);
          if (screenshot) {
            loadAllScreenshots();
          } else {
            setError('Failed to capture screenshot of current page');
          }
        } else {
          // Open the target page in a new tab to capture it
          const baseUrl = window.location.origin;
          const fullUrl = baseUrl + url;

          const newTab = window.open(fullUrl, '_blank');

          // Wait for page to load, then capture
          setTimeout(async () => {
            try {
              // The new page should auto-capture on load
              newTab.close();
              // Wait a bit more for the capture to complete
              setTimeout(() => {
                loadAllScreenshots();
              }, 1000);
            } catch (err) {
              console.error('Error with new tab:', err);
              setError('Failed to capture screenshot from new tab');
            }
          }, 3000);
        }
      }
    } catch (err) {
      console.error('Error capturing screenshot:', err);
      setError('Failed to capture new screenshot');
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const clearAllData = async () => {
    const confirmMessage = `Are you sure you want to completely reset ALL heatmap data?

This will:
• Delete ALL heatmap records from MongoDB database
• Clear ALL localStorage heatmap data  
• Clear ALL screenshots
• Reset ALL guest user tracking data
• Clear ALL visitor information

This action cannot be undone!`;

    if (window.confirm(confirmMessage)) {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 Starting complete data reset...');
        
        // Get current data counts
        const dbCount = await heatmapService.getDatabaseDataCount();
        const localCount = heatmapService.getLocalDataCount();
        
        console.log(`📊 Current data - Database: ${dbCount.count} records, LocalStorage: ${localCount} entries`);
        
        // Clear all heatmap data (database + localStorage + guest data)
        const resetResult = await heatmapService.resetAllHeatmapData();
        
        // Clear screenshots
        screenshotService.clearAllScreenshots();
        
        // Reset component state
        setScreenshots([]);
        setSelectedScreenshot(null);
        setHeatmapData(null);
        setVisitorData([]);
        clearHeatmapOverlay();
        
        // Refresh data counts to show 0
        await loadDataCount();
        
        // Show success message
        alert(`✅ Complete reset successful!\n\n${resetResult.message}\n\nAll heatmap data has been reset to 0.`);
        
        console.log('✅ Complete data reset finished:', resetResult);
        
      } catch (error) {
        console.error('❌ Data reset failed:', error);
        setError(`Failed to reset data: ${error.message}`);
        alert(`❌ Reset failed: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDeviceInfo = (device) => {
    if (!device) return 'Unknown Device';
    return `${device.browser} on ${device.os} (${device.device})`;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }} className='heatmapWrap'>
      <h2 className='heatmapHeading' style={{marginBottom: "16px"}}>Heatmap Integration</h2>
      {/* Controls */}
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h4 style={{fontWeight: 500}}>Controls Heatmap From Here:</h4>
        
        {/* Data Count Display */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          padding: '12px',
          marginTop: '10px',
          marginBottom: '15px',
          fontSize: '14px'
        }}>
          <strong>📊 Current Data:</strong>
          <div style={{ marginTop: '5px', color: '#6c757d' }}>
            🗄️ Database: <strong>{dataCount.database}</strong> heatmap records
            <br />
            💾 LocalStorage: <strong>{dataCount.localStorage}</strong> entries
            <br />
            👥 Visitors: <strong>{visitorData.length}</strong> tracked visits
          </div>
          <button
            onClick={loadDataCount}
            style={{
              padding: '4px 8px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
              marginTop: '8px'
            }}
          >
            🔄 Refresh Count
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',marginTop: '10px' }}>
          <button
            onClick={loadHeatmapForScreenshot}
            disabled={loading || !selectedScreenshot}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Refresh Heatmap
          </button>

          <button
            onClick={clearAllData}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🗑️ Clear All Data
          </button>

          <button
            onClick={async () => {
              if (window.confirm('Reset guest tracking data? This will clear existing guest visit counts and start fresh.')) {
                heatmapService.resetCorruptedGuestData();
                await loadVisitorData(); // Refresh visitor data
                await loadDataCount(); // Refresh data count
                alert('Guest data reset complete! Visit count will increment on page reloads or after 5+ minute gaps between interactions.');
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Reset Guest Data
          </button>

          <button
            onClick={loadVisitorData}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Refresh Visitors
          </button>

          <button
            onClick={async () => {
              if (selectedScreenshot) {
                console.log('🔥 Loading heatmap data from database for', selectedScreenshot.url);
                setLoading(true);

                try {
                  // Load heatmap data from database instead of localStorage
                  const heatmapData = await heatmapService.loadHeatmapData(selectedScreenshot.url);

                  if (heatmapData && heatmapData.data && heatmapData.data.length > 0) {
                    showGreenDots(heatmapData);
                    setError(null);
                    console.log(`✅ Displaying ${heatmapData.data.length} interaction points from database`);
                  } else {
                    // Check localStorage as fallback
                    const localData = heatmapService.getLocalHeatmapData(selectedScreenshot.url);
                    if (localData && localData.length > 0) {
                      console.log('📦 Found localStorage data, using as fallback...');
                      const data = { data: localData };
                      showGreenDots(data);
                      setError(null);
                      console.log(`✅ Displaying ${localData.length} interaction points from localStorage`);
                    } else {
                      const message = heatmapData?.message || `No interaction data found for ${selectedScreenshot.url}. Visit this page and interact with it first.`;
                      setError(message);
                      clearHeatmapOverlay();
                    }
                  }
                } catch (error) {
                  console.error('Error loading heatmap data:', error);
                  setError('Failed to load heatmap data: ' + error.message);
                } finally {
                  setLoading(false);
                }
              }
            }}
            disabled={!selectedScreenshot}
            style={{
              padding: '10px 20px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔥 Show Heatmap
          </button>

        </div>

        {screenshots.length === 0 && (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            color: '#856404'
          }}>
            No screenshots available
          </div>
        )}
      </div>

      {/* {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )} */}

      {/* Page Heatmap Analysis */}
      <div style={{
        backgroundColor: '#e8f5e8',
        border: '1px solid #4caf50',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3>🔥Page Heatmap Analysis</h3>
        <p style={{marginBottom: '10px', marginTop: '10px'}}>View visitor interactions overlaid on screenshots</p>

        {screenshots.length > 0 ? (
          <div>
            <div style={{ marginBottom: '15px' }} className='pageSelectWrap'>
              <label style={{ marginRight: '10px', fontWeight: '500' }}>Select Page:</label>
              <select
                value={selectedScreenshot?.url || ''}
                onChange={(e) => {
                  const screenshot = screenshots.find(s => s.url === e.target.value);
                  setSelectedScreenshot(screenshot);
                }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              >
                <option value="">Choose a page...</option>
                {screenshots.map((screenshot, index) => (
                  <option key={index} value={screenshot.url}>
                    {screenshot.url} ({formatDate(screenshot.timestamp)})
                  </option>
                ))}
              </select>
            </div>

            {selectedScreenshot && (
              <div style={{
                border: '2px solid #4caf50',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#fff',
                maxWidth: '100%',
                display: 'inline-block'
              }}>
                {/* Page Screenshot */}
                <img
                  src={selectedScreenshot.dataUrl}
                  alt={`Screenshot of ${selectedScreenshot.url}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                  onLoad={() => {
                    // Only load heatmap data, don't track page visits
                    // This is just displaying a screenshot, not an actual page visit
                    console.log('📸 Screenshot image loaded, displaying heatmap overlay');
                  }}
                />

                {/* Heatmap Overlay Container */}
                <div
                  ref={heatmapContainerRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}
                />

                {/* Loading Indicator */}
                {loading && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '20px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    zIndex: 20
                  }}>
                    <div>Loading heatmap data...</div>
                  </div>
                )}

                {/* Interaction Stats */}
                {heatmapData && heatmapData.data && heatmapData.data.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(76, 175, 80, 0.9)',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: 'white',
                    zIndex: 20
                  }}>
                    {heatmapData.data.length} interactions found
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: '30px',
            textAlign: 'center',
            backgroundColor: '#fff3cd',
            borderRadius: '4px',
            border: '1px solid #ffeaa7',
            color: '#856404'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>📸 No page screenshots yet</div>
            <div>Visit some pages on your website to automatically capture screenshots for heatmap analysis.</div>
          </div>
        )}
      </div>

      {/* Visitor Analytics Section */}
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3>👥 Recent Visitors</h3>
        {visitorData.length > 0 ? (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {visitorData.slice(0, 10).map((visitor, index) => (
              <div key={index} style={{
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '8px',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div><strong>👤 User:</strong> {visitor.user?.userEmail || visitor.user?.userId || 'Guest'}</div>
                    <div><strong>📄 Page:</strong> {visitor.page}</div>
                    <div><strong>🕒 Time:</strong> {formatDate(visitor.timestamp)}</div>
                    <div><strong>💻 Device:</strong> {formatDeviceInfo(visitor.device)}</div>
                    {visitor.referrer && (
                      <div><strong>🔗 Referrer:</strong> {visitor.referrer}</div>
                    )}
                  </div>
                  <div style={{
                    backgroundColor: visitor.user?.isAuthenticated ? '#28a745' : '#6c757d',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {visitor.user?.isAuthenticated ? 'Logged In' : 'Guest'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6c757d',
            backgroundColor: 'white',
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}>
            No visitor data available yet. Visit some pages to see visitor information.
          </div>
        )}

        <div style={{ marginTop: '15px', fontSize: '14px', color: '#6c757d' }}>
          Total visits: {visitorData.length} | Showing recent 10 visits
        </div>
      </div>




    </div>
  );
};

export default HeatmapIntegration;