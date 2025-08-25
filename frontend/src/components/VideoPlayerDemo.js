import React, { useState, useEffect, useRef } from 'react';
import h337 from 'heatmapjs';

const VideoPlayerDemo = ({ selectedScreenshot, heatmapData, onShowHeatmap }) => {
  // Debug logging
  console.log('🎬 VideoPlayerDemo props:', {
    selectedScreenshot: selectedScreenshot?.url,
    heatmapData: heatmapData,
    heatmapDataLength: heatmapData?.data?.length
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentViewportImage, setCurrentViewportImage] = useState(null);
  const heatmapContainerRef = useRef(null);
  const heatmapInstanceRef = useRef(null);
  const animationRef = useRef(null);
  const canvasRef = useRef(null);


  const [demoSlides, setDemoSlides] = useState([]);

  // Update slides when heatmapData changes
  useEffect(() => {
    // Create individual viewport slides for each user interaction
    const createSlides = () => {
      console.log('🔍 Creating interaction slides with data:', heatmapData);
      
      if (!heatmapData || !heatmapData.data || heatmapData.data.length === 0) {
        console.log('❌ No real heatmap data available, returning empty array');
        return [];
      }

      // Create individual slides for each interaction in chronological order
      const sortedInteractions = [...heatmapData.data]
        .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
      
      console.log('📊 Total real user interactions found:', sortedInteractions.length);
      console.log('📍 First few interactions:', sortedInteractions.slice(0, 3));
      console.log('📍 Last few interactions:', sortedInteractions.slice(-3));
      
      const viewportHeight = 600; // 100vh equivalent
      const slides = [];
      
      sortedInteractions.forEach((interaction, index) => {
        // Calculate 100vh viewport window centered around this interaction
        const interactionY = interaction.y;
        const viewportCenterY = interactionY;
        
        // Calculate viewport bounds (100vh window)
        const viewportStartY = Math.max(0, viewportCenterY - (viewportHeight / 2));
        const viewportEndY = viewportStartY + viewportHeight;
        
        // Adjust interaction Y coordinate relative to this viewport
        const relativeY = interactionY - viewportStartY;
        
        const slide = {
          name: `Real User Interaction ${index + 1}`,
          description: `User ${interaction.eventType || 'interacted'} at (${interaction.x}, ${interaction.y})`,
          duration: 3000,
          interactionPoint: {
            x: interaction.x,
            y: interaction.y, // Original Y position
            value: interaction.value,
            eventType: interaction.eventType,
            timestamp: interaction.timestamp
          },
          viewport: { 
            startY: viewportStartY, 
            endY: viewportEndY, 
            centerY: viewportCenterY,
            actualHeight: viewportHeight
          },
          heatmapPoints: [{
            x: interaction.x,
            y: relativeY, // Y position relative to viewport
            value: interaction.value
          }]
        };
        
        console.log(`✅ Created slide ${index + 1}:`, slide.interactionPoint);
        slides.push(slide);
      });

      // Return all user interactions - don't limit them
      console.log(`🎬 Created ${slides.length} total interaction slides from real user data`);
      return slides;
    };

    const slides = createSlides();
    setDemoSlides(slides);
    console.log('📊 Updated demo slides:', slides.length);
    console.log('🔢 Data Comparison:');
    console.log('   Screenshot heatmap points:', heatmapData?.data?.length || 0);
    console.log('   Video interaction slides:', slides.length);
    if (heatmapData?.data?.length && heatmapData.data.length !== slides.length) {
      console.warn('⚠️ Mismatch! Video should show all', heatmapData.data.length, 'interactions');
    } else {
      console.log('✅ Perfect match - showing all user interactions in video');
    }
  }, [heatmapData, selectedScreenshot]);

  // Calculate total demo duration
  const totalDuration = demoSlides.reduce((total, slide) => total + slide.duration, 0);

  useEffect(() => {
    if (selectedScreenshot && heatmapContainerRef.current) {
      initializeVideoHeatmap();
    }
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [selectedScreenshot]);

  const initializeVideoHeatmap = () => {
    if (!heatmapContainerRef.current || !selectedScreenshot) {
      console.log('Cannot initialize heatmap: missing container or screenshot');
      return;
    }

    // Get image dimensions for scaling
    const img = heatmapContainerRef.current.previousElementSibling;
    if (!img) {
      console.log('Cannot initialize heatmap: no image found');
      return;
    }

    const imgRect = img.getBoundingClientRect();
    
    // Only initialize if image has valid dimensions
    if (imgRect.width === 0 || imgRect.height === 0) {
      console.log('Cannot initialize heatmap: image has no dimensions');
      return;
    }

    // Setup container
    heatmapContainerRef.current.innerHTML = '';
    heatmapContainerRef.current.style.width = `${imgRect.width}px`;
    heatmapContainerRef.current.style.height = `${imgRect.height}px`;
    heatmapContainerRef.current.style.setProperty('position', 'absolute', 'important');
    heatmapContainerRef.current.style.top = '0px';
    heatmapContainerRef.current.style.left = '0px';
    heatmapContainerRef.current.style.pointerEvents = 'none';
    heatmapContainerRef.current.style.zIndex = '10';

    // Create heatmap instance
    try {
      if (heatmapInstanceRef.current) {
        heatmapInstanceRef.current = null;
      }

      heatmapInstanceRef.current = h337.create({
        container: heatmapContainerRef.current,
        radius: 30,
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

      // Initialize with empty data
      heatmapInstanceRef.current.setData({ data: [], max: 5 });
      console.log('✅ Video heatmap initialized successfully');

    } catch (error) {
      console.error('Failed to initialize video heatmap:', error);
    }
  };

  const playDemo = () => {
    if (!selectedScreenshot) {
      alert('Please select a page from the heatmap section above first');
      return;
    }

    if (demoSlides.length === 0) {
      alert('No user interactions found. Please click "Show Heatmap" button first to load interaction data.');
      return;
    }

    setIsPlaying(true);
    setCurrentStep(0);
    setProgress(0);

    // Clear existing heatmap if it exists
    if (heatmapInstanceRef.current) {
      heatmapInstanceRef.current.setData({ data: [], max: 5 });
    }

    let currentTime = 0;

    const executeSlide = async (slideIndex) => {
      if (slideIndex >= demoSlides.length) {
        setIsPlaying(false);
        setProgress(100);
        return;
      }

      const slide = demoSlides[slideIndex];
      setCurrentStep(slideIndex);

      console.log(`🎬 Executing slide ${slideIndex + 1}: ${slide.name}`);

      // Create viewport-specific screenshot for this interaction
      if (slide.viewport) {
        const viewportImage = await createViewportScreenshot(slide.viewport);
        if (viewportImage) {
          setCurrentViewportImage(viewportImage);
          
          // Wait a moment for image to load, then show heatmap
          setTimeout(() => {
            showInteractionHeatmap(slide);
          }, 100);
        }
      } else {
        // Fallback to full screenshot
        setCurrentViewportImage(selectedScreenshot.dataUrl);
        setTimeout(() => {
          showInteractionHeatmap(slide);
        }, 100);
      }

      // Update progress
      currentTime += slide.duration;
      setProgress((currentTime / totalDuration) * 100);

      // Move to next slide
      animationRef.current = setTimeout(() => {
        executeSlide(slideIndex + 1);
      }, slide.duration);
    };

    executeSlide(0);
  };

  // Create viewport-specific screenshot from the full screenshot
  const createViewportScreenshot = (viewport) => {
    return new Promise((resolve) => {
      if (!selectedScreenshot || !viewport) {
        resolve(null);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate the viewport section to crop
        const fullHeight = selectedScreenshot.fullPageHeight || selectedScreenshot.viewportHeight;
        const scaleY = img.height / fullHeight;
        const scaleX = img.width / selectedScreenshot.viewportWidth;
        
        // Set canvas size to viewport dimensions (100vh equivalent)
        const viewportHeight = 600; // 100vh equivalent
        canvas.width = selectedScreenshot.viewportWidth;
        canvas.height = viewportHeight;
        
        // Calculate source coordinates for cropping
        const sourceY = viewport.startY * scaleY;
        const sourceHeight = (viewport.endY - viewport.startY) * scaleY;
        
        // Draw the cropped section
        ctx.drawImage(
          img,
          0, sourceY, // Source x, y
          img.width, sourceHeight, // Source width, height
          0, 0, // Destination x, y
          canvas.width, canvas.height // Destination width, height
        );
        
        // Convert to data URL
        const croppedDataUrl = canvas.toDataURL('image/png');
        resolve(croppedDataUrl);
      };
      
      img.onerror = () => resolve(null);
      img.src = selectedScreenshot.dataUrl;
    });
  };

  // Show interaction heatmap on the cropped viewport screenshot
  const showInteractionHeatmap = (slide) => {
    if (!slide.heatmapPoints || slide.heatmapPoints.length === 0) {
      return;
    }

    const img = heatmapContainerRef.current?.previousElementSibling;
    if (!img) return;

    // Initialize heatmap if it doesn't exist yet
    if (!heatmapInstanceRef.current) {
      initializeVideoHeatmap();
    }

    if (!heatmapInstanceRef.current) {
      console.warn('Failed to initialize heatmap instance');
      return;
    }

    const imgRect = img.getBoundingClientRect();
    
    // For cropped viewport, coordinates are already relative to the viewport
    const scaleX = imgRect.width / selectedScreenshot.viewportWidth;
    const scaleY = imgRect.height / 600; // 100vh viewport height

    const transformedData = {
      max: 5,
      data: slide.heatmapPoints.map(point => ({
        x: Math.round(point.x * scaleX),
        y: Math.round(point.y * scaleY), // Y is already adjusted relative to viewport
        value: point.value
      }))
    };

    // Show this interaction's heatmap in the correct position
    heatmapInstanceRef.current.setData(transformedData);

    // Force canvas absolute positioning with !important
    setTimeout(() => {
      const canvas = heatmapContainerRef.current?.querySelector('canvas');
      if (canvas) {
        canvas.style.setProperty('position', 'absolute', 'important');
        canvas.style.top = '0px';
        canvas.style.left = '0px';
      }
      
      // Also ensure container stays absolute with !important
      if (heatmapContainerRef.current) {
        heatmapContainerRef.current.style.setProperty('position', 'absolute', 'important');
        heatmapContainerRef.current.style.top = '0px';
        heatmapContainerRef.current.style.left = '0px';
      }
    }, 10);

    // Show interaction indicators
    if (slide.viewport && slide.interactionPoint) {
      showViewportIndicator(slide.viewport, slide.interactionPoint);
    }
    
    console.log(`🎯 Slide ${currentStep + 1}: Showing interaction at (${slide.interactionPoint?.x}, ${slide.interactionPoint?.y}) in viewport Y:${slide.viewport?.startY}-${slide.viewport?.endY}`);
  };

  // Show viewport cropping indicator for individual interactions
  const showViewportIndicator = (viewport, interactionPoint) => {
    if (!heatmapContainerRef.current) return;

    // Create viewport position indicator
    const viewportIndicator = document.createElement('div');
    viewportIndicator.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(33, 150, 243, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: bold;
      z-index: 25;
      max-width: 200px;
    `;
    
    viewportIndicator.innerHTML = `
      <div>🎬 Viewport: Y ${viewport.startY}-${viewport.endY}px</div>
      <div>🎯 ${interactionPoint.eventType || 'Interaction'}: (${interactionPoint.x}, ${interactionPoint.y})</div>
    `;
    
    // Add to container temporarily
    heatmapContainerRef.current.appendChild(viewportIndicator);
    
    // Create interaction point indicator
    const pointIndicator = document.createElement('div');
    const img = heatmapContainerRef.current.previousElementSibling;
    const imgRect = img.getBoundingClientRect();
    const scaleX = imgRect.width / selectedScreenshot.viewportWidth;
    const scaleY = imgRect.height / (viewport?.actualHeight || 600);
    
    // Calculate position relative to current viewport
    const relativeY = interactionPoint.y - viewport.startY;
    const indicatorX = interactionPoint.x * scaleX;
    const indicatorY = relativeY * scaleY;
    
    pointIndicator.style.cssText = `
      position: absolute;
      left: ${indicatorX - 8}px;
      top: ${indicatorY - 8}px;
      width: 16px;
      height: 16px;
      background: rgba(255, 255, 255, 0.9);
      border: 2px solid #ff4444;
      border-radius: 50%;
      z-index: 30;
      animation: pulse 1s infinite;
    `;
    
    heatmapContainerRef.current.appendChild(pointIndicator);
    
    // Add pulse animation style
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    // Remove after slide duration
    setTimeout(() => {
      if (viewportIndicator.parentNode) {
        viewportIndicator.parentNode.removeChild(viewportIndicator);
      }
      if (pointIndicator.parentNode) {
        pointIndicator.parentNode.removeChild(pointIndicator);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 2800);
  };

  const stopDemo = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setProgress(0);
    setCurrentViewportImage(null);
    
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }

    // Clear heatmap
    if (heatmapInstanceRef.current) {
      heatmapInstanceRef.current.setData({ data: [], max: 5 });
    }
  };

  const resetDemo = () => {
    stopDemo();
    setCurrentViewportImage(null);
    if (heatmapInstanceRef.current) {
      heatmapInstanceRef.current.setData({ data: [], max: 5 });
    }
  };

  if (!selectedScreenshot) {
    return (
      <div style={{
        padding: '30px',
        textAlign: 'center',
        backgroundColor: '#fff3cd',
        borderRadius: '4px',
        border: '1px solid #ffeaa7',
        color: '#856404'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>🎥 No Page Selected</div>
        <div>Please select a page from the heatmap analysis section above to watch the interaction demo.</div>
      </div>
    );
  }

  if (demoSlides.length === 0) {
    return (
      <div style={{
        padding: '30px',
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        borderRadius: '4px',
        border: '1px solid #f5c6cb',
        color: '#721c24'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>📊 No Real User Interactions Found</div>
        <div style={{ marginBottom: '10px' }}>
          No user interaction data available for this page. The video demo needs real user interactions to work.
        </div>
        <div style={{ fontSize: '14px', color: '#856404' }}>
          💡 <strong>To see the demo:</strong><br />
          1. Visit this page and interact with it (clicks, mouse moves)<br />
          2. Come back and click "Show Heatmap" button first<br />
          3. Then the video demo will show your actual interactions
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Video Controls */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #2196f3',
        borderRadius: '6px',
        padding: '15px',
        marginBottom: '15px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={playDemo}
            disabled={isPlaying}
            style={{
              padding: '10px 20px',
              backgroundColor: isPlaying ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            ▶️ {isPlaying ? 'Playing...' : 'Play Demo'}
          </button>

          <button
            onClick={stopDemo}
            disabled={!isPlaying}
            style={{
              padding: '10px 20px',
              backgroundColor: !isPlaying ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: !isPlaying ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            ⏹️ Stop
          </button>

          <button
            onClick={resetDemo}
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
            🔄 Reset
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '10px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '5px'
          }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2196f3' }}>
              {isPlaying ? `${demoSlides[currentStep]?.name}` : 'Demo Ready'}
            </span>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {Math.round(progress)}%
            </span>
          </div>
          
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#2196f3',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {isPlaying && demoSlides[currentStep] && (
            <div style={{
              marginTop: '5px',
              fontSize: '12px',
              color: '#666',
              fontStyle: 'italic'
            }}>
              {demoSlides[currentStep].description}
            </div>
          )}
        </div>
      </div>

      {/* Video Screenshot with Heatmap Overlay - Only show when playing */}
      {isPlaying && currentViewportImage && (
        <div style={{
          border: '2px solid #2196f3',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#fff',
          maxWidth: '100%',
          display: 'inline-block'
        }}>
          {/* Dynamic Viewport Screenshot */}
          <img
            src={currentViewportImage}
            alt={`Demo of ${selectedScreenshot.url}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
            onLoad={() => {
              initializeVideoHeatmap();
            }}
          />

          {/* Heatmap Overlay Container for Video */}
          <div
            ref={heatmapContainerRef}
            style={{
              position: 'absolute !important',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />

          {/* Demo Status Overlay */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(33, 150, 243, 0.9)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'white',
            zIndex: 20
          }}>
            🎬 {demoSlides[currentStep]?.name}
          </div>
        </div>
      )}

      {/* Placeholder when not playing */}
      {!isPlaying && (
        <div style={{
          border: '2px solid #e0e0e0',
          borderRadius: '8px',
          padding: '60px 20px',
          textAlign: 'center',
          backgroundColor: '#f9f9f9',
          color: '#666',
          maxWidth: '100%',
          display: 'inline-block',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎬</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            Video Player Ready
          </div>
          <div style={{ fontSize: '14px', color: '#999' }}>
            Click "Play Demo" to start the user interaction video
          </div>
        </div>
      )}

      {/* Demo Slides Legend */}
      <div style={{
        marginTop: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '6px',
        padding: '15px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#495057' }}>
          🎯 Individual Interaction Slides ({demoSlides.length} interactions):
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {demoSlides.map((slide, index) => (
            <div
              key={index}
              style={{
                padding: '8px 12px',
                backgroundColor: currentStep === index && isPlaying ? '#e3f2fd' : '#fff',
                border: currentStep === index && isPlaying ? '2px solid #2196f3' : '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#495057' }}>
                {slide.name}
              </div>
              <div style={{ color: '#6c757d', marginTop: '2px' }}>
                {slide.description}
              </div>
              <div style={{ color: '#28a745', marginTop: '2px', fontSize: '11px' }}>
                🎯 {slide.interactionPoint?.eventType || 'Interaction'} at ({slide.interactionPoint?.x}, {slide.interactionPoint?.y})
              </div>
              {slide.viewport && (
                <div style={{ color: '#007bff', marginTop: '2px', fontSize: '11px' }}>
                  📱 Viewport: Y {slide.viewport.startY}-{slide.viewport.endY}px
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerDemo;