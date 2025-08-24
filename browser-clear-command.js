// Browser Console Command to Clear All MongoDB Data
// Copy and paste this into your browser console when on your app

async function clearAllMongoDBData() {
  try {
    console.log('🗑️ Clearing all MongoDB heatmap data...');
    
    // Get current count
    const countResponse = await fetch('/api/heatmap/data-count');
    const countData = await countResponse.json();
    console.log(`📊 Current records: ${countData.count}`);
    
    if (countData.count === 0) {
      console.log('✅ Database is already empty!');
      return;
    }
    
    // Confirm deletion
    if (!confirm(`Delete all ${countData.count} heatmap records from MongoDB?`)) {
      console.log('❌ Cancelled by user');
      return;
    }
    
    // Clear all data
    const response = await fetch('/api/heatmap/clear-all-data', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        confirm: 'DELETE_ALL_HEATMAP_DATA',
        tenantId: null
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Successfully deleted ${result.deletedCount} records`);
      console.log('🎉 MongoDB data cleared! All heatmap data is now 0.');
    } else {
      console.error('❌ Failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the function
clearAllMongoDBData();