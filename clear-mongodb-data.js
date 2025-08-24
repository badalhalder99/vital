// MongoDB Script to Clear All Heatmap Data
// Run this with: mongosh your_database_name clear-mongodb-data.js

// Connect to your database (replace 'multi_tenant_saas' with your database name)
use multi_tenant_saas

// Show current count
print("📊 Current heatmap records:", db.heatmap_data.countDocuments())

// Clear all heatmap data
print("🗑️ Deleting all heatmap data...")
const result = db.heatmap_data.deleteMany({})
print("✅ Deleted", result.deletedCount, "records")

// Verify it's empty
print("🔍 Remaining records:", db.heatmap_data.countDocuments())

// Optional: Clear other collections if needed
// db.analytics.deleteMany({})  // Uncomment to clear analytics
// db.visitors.deleteMany({})   // Uncomment to clear visitors

print("✅ MongoDB data clearing complete!")