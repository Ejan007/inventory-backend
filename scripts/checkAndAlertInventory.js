/**
 * Email Service Integration Example
 * 
 * This script demonstrates how to use the emailNotifier utility
 * to send emails when inventory levels change
 */
const { PrismaClient } = require('@prisma/client');
const emailNotifier = require('../utils/emailNotifier');

const prisma = new PrismaClient();

/**
 * Check inventory levels and send alerts for items below threshold
 */
async function checkInventoryAndAlert() {
  try {
    console.log('Checking inventory levels...');
    
    // Get all stores
    const stores = await prisma.store.findMany({
      include: {
        items: true
      }
    });
    
    for (const store of stores) {
      // Find items below required levels
      const lowStockItems = store.items.filter(item => 
        item.quantity < item.required
      );
      
      if (lowStockItems.length > 0) {
        console.log(`Found ${lowStockItems.length} low stock items in ${store.name}`);
        
        // Prepare items for email
        const itemsForEmail = lowStockItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          required: item.required,
          shortage: item.required - item.quantity
        }));
        
        // Determine if alert is urgent (if any item has zero stock)
        const hasZeroStock = lowStockItems.some(item => item.quantity === 0);
        
        // Get admin emails from database or configuration
        const adminEmails = ['admin@stockit.com']; // Replace with actual admin emails
        
        // Send low stock alert
        const result = await emailNotifier.sendLowStockAlert({
          recipient: adminEmails,
          storeName: store.name,
          items: itemsForEmail,
          urgent: hasZeroStock
        });
        
        if (result.success) {
          console.log(`✅ Low stock alert sent for ${store.name}`);
        } else {
          console.error(`❌ Failed to send low stock alert for ${store.name}: ${result.error}`);
        }
      } else {
        console.log(`All items in ${store.name} have sufficient stock`);
      }
    }
    
    console.log('Inventory check complete');
    
  } catch (error) {
    console.error('Error checking inventory:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
checkInventoryAndAlert();
