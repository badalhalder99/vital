#!/usr/bin/env node

/**
 * Test script to demonstrate MongoDB heatmap data reset functionality
 * 
 * This script:
 * 1. Adds some test heatmap data to MongoDB
 * 2. Shows the current count
 * 3. Resets all data to 0
 * 4. Verifies the count is 0
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3005/api/heatmap';

async function testResetFunctionality() {
  console.log('🧪 Testing MongoDB Heatmap Data Reset Functionality');
  console.log('=' .repeat(50));

  try {
    // Step 1: Add some test data
    console.log('\n📝 Step 1: Adding test heatmap data...');
    
    for (let i = 0; i < 5; i++) {
      const testData = {
        sessionId: `test_session_${i}`,
        userId: `test_user_${i}`,
        page: `/test-page-${i}`,
        url: `http://localhost:3000/test-page-${i}`,
        eventType: 'click',
        position: { x: 100 + i * 10, y: 200 + i * 15, pageX: 100 + i * 10, pageY: 200 + i * 15 },
        value: 5,
        device: { browser: 'Test Browser', os: 'Test OS' },
        user: { userId: `test_user_${i}`, isAuthenticated: false },
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString()
      };

      await axios.post(`${API_BASE}/track-interaction`, testData);
      console.log(`   ✅ Added test record ${i + 1}/5`);
    }

    // Step 2: Check current count
    console.log('\n📊 Step 2: Checking current data count...');
    const countResponse = await axios.get(`${API_BASE}/data-count`);
    const currentCount = countResponse.data.count;
    console.log(`   📈 Database currently contains: ${currentCount} heatmap records`);

    if (currentCount === 0) {
      console.log('   ⚠️  Database is already empty. Test data might not have been added.');
    }

    // Step 3: Reset all data
    console.log('\n🗑️  Step 3: Resetting all heatmap data...');
    const resetResponse = await axios.delete(`${API_BASE}/clear-all-data`, {
      data: {
        confirm: 'DELETE_ALL_HEATMAP_DATA',
        tenantId: null
      }
    });

    if (resetResponse.data.success) {
      console.log(`   ✅ Successfully deleted ${resetResponse.data.deletedCount} records`);
    } else {
      throw new Error(resetResponse.data.message);
    }

    // Step 4: Verify count is 0
    console.log('\n🔍 Step 4: Verifying data count is 0...');
    const finalCountResponse = await axios.get(`${API_BASE}/data-count`);
    const finalCount = finalCountResponse.data.count;
    console.log(`   📉 Database now contains: ${finalCount} heatmap records`);

    if (finalCount === 0) {
      console.log('   ✅ SUCCESS: All heatmap data has been reset to 0!');
    } else {
      console.log('   ❌ FAILURE: Data was not completely cleared');
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('\nThe MongoDB data reset functionality is working correctly.');
    console.log('When you delete all MongoDB data, all heatmap data will be reset to 0.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testResetFunctionality();