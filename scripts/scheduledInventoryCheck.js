/**
 * Scheduled Inventory Check & Email Alerts
 * 
 * This script is designed to be run as a scheduled task (e.g., via cron job or Task Scheduler)
 * to regularly check inventory levels and send email alerts when items are low.
 * 
 * Example scheduling:
 * - Daily: Run once per day to check all inventory
 * - Hourly: Run for critical inventory that needs more frequent checks
 * 
 * To schedule on Windows:
 * 1. Open Task Scheduler
 * 2. Create a new Basic Task
 * 3. Set the trigger (e.g., Daily)
 * 4. Set the action to "Start a Program"
 * 5. Program/script: node.exe
 * 6. Arguments: scripts/scheduledInventoryCheck.js
 * 7. Start in: Path to your StockIT Backend directory
 */
const { PrismaClient } = require('@prisma/client');
const emailNotifier = require('../utils/emailNotifier');
const path = require('path');
const fs = require('fs');

// Enable loading of environment variables
require('dotenv').config();

const prisma = new PrismaClient();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file for this run
const logFile = path.join(logsDir, `inventory-check-${new Date().toISOString().split('T')[0]}.log`);

/**
 * Write a message to both console and log file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

/**
 * Check inventory levels and send alerts for items below threshold
 */
async function scheduledInventoryCheck() {
  try {
    log('Starting scheduled inventory check...');
    
    // Get all stores with their items
    const stores = await prisma.store.findMany({
      include: {
        items: true,
        organization: true
      }
    });
    
    log(`Found ${stores.length} stores to check`);
    
    let totalAlertsSent = 0;
    let totalItemsChecked = 0;
    
    for (const store of stores) {
      // Find items below required levels
      const lowStockItems = store.items.filter(item => 
        item.quantity < item.required
      );
      
      totalItemsChecked += store.items.length;
      
      if (lowStockItems.length > 0) {
        log(`Found ${lowStockItems.length} low stock items in ${store.name}`);
        
        // Prepare items for email
        const itemsForEmail = lowStockItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          required: item.required,
          shortage: item.required - item.quantity
        }));
        
        // Determine if alert is urgent (if any item has zero stock or is less than 20% of required)
        const hasUrgentShortage = lowStockItems.some(item => 
          item.quantity === 0 || item.quantity < (item.required * 0.2)
        );
        
        // Get admin emails for this organization
        // In a real application, you would fetch the admin email addresses
        // from the database based on the organization
        const adminEmails = [
          process.env.ADMIN_EMAIL || 'admin@stockit.com',
          store.organization?.email || 'organization@stockit.com'
        ].filter(Boolean);
        
        // Send low stock alert
        const result = await emailNotifier.sendLowStockAlert({
          recipient: adminEmails,
          storeName: store.name,
          items: itemsForEmail,
          urgent: hasUrgentShortage
        });
        
        if (result.success) {
          log(`✅ Low stock alert sent for ${store.name}`);
          totalAlertsSent++;
        } else {
          log(`❌ Failed to send low stock alert for ${store.name}: ${result.error}`);
        }
      } else {
        log(`All items in ${store.name} have sufficient stock`);
      }
    }
    
    log(`Inventory check complete. Checked ${totalItemsChecked} items across ${stores.length} stores.`);
    log(`Sent ${totalAlertsSent} alerts for low stock items.`);
    
  } catch (error) {
    log(`ERROR: ${error.message}`);
    log(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
scheduledInventoryCheck();
