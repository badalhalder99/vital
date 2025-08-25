import  { useState, useEffect, useRef } from 'react';
import heatmapService from '../services/heatmapService';

const HeatmapViewer = ({ page, dateRange, tenantId, className = '' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const containerRef = useRef(null);
  const heatmapInstanceRef = useRef(null);

  useEffect(() => {
    if (page) {
      loadHeatmapData();
    }
  }, [page, dateRange, tenantId]);

  const loadHeatmapData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await heatmapService.loadHeatmapData(page, dateRange);
      if (data && data.data) {
        setHeatmapData(data);
        displayHeatmap(data);
      } else {
        setError('No heatmap data available for this page');
      }
    } catch (err) {
      console.error('Error loading heatmap data:', err);
      setError('Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  };

  const displayHeatmap = (data) => {
    if (!containerRef.current || !data) return;

    // Clear existing heatmap
    if (heatmapInstanceRef.current) {
      heatmapInstanceRef.current.setData({ data: [], max: 0 });
    }

    // Create new heatmap instance
    heatmapInstanceRef.current = heatmapService.initializeHeatmap(containerRef.current);
    heatmapInstanceRef.current.setData(data);
  };

  const clearHeatmap = () => {
    if (heatmapInstanceRef.current) {
      heatmapInstanceRef.current.setData({ data: [], max: 0 });
    }
    setHeatmapData(null);
  };

  const refreshHeatmap = () => {
    loadHeatmapData();
  };

  return (
    <div className={`heatmap-viewer ${className}`}>
      <div className="heatmap-controls" style={{ marginBottom: '10px' }}>
        <button
          onClick={refreshHeatmap}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Loading...' : 'Refresh Heatmap'}
        </button>

        <button
          onClick={clearHeatmap}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Heatmap
        </button>

        {heatmapData && (
          <span style={{ marginLeft: '20px', fontSize: '14px', color: '#666' }}>
            Data points: {heatmapData.data?.length || 0}
          </span>
        )}
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          {error}
        </div>
      )}

      <div
        ref={containerRef}
        className="heatmap-container"
        style={{
          position: 'relative',
          width: '100%',
          height: '600px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#f8f9fa',
          overflow: 'hidden'
        }}
      >
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <div>Loading heatmap data...</div>
          </div>
        )}

        {!loading && !heatmapData && !error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#666'
          }}>
            <div>No heatmap data to display</div>
            <div style={{ fontSize: '14px', marginTop: '10px' }}>
              Visit the page to generate interaction data
            </div>
          </div>
        )}
      </div>

      {page && (
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Showing heatmap for: <strong>{page}</strong>
          {dateRange && (
            <span>
              {' '}from {dateRange.start} to {dateRange.end}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default HeatmapViewer;