const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to delete all data from the database while preserving the schema
 * This performs a cascading delete in the correct order to respect foreign key constraints
 */
async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...');
  
  try {
    // Step 1: Delete all ItemHistory records
    console.log('Deleting item history records...');
    const deletedItemHistory = await prisma.itemHistory.deleteMany({});
    console.log(`✅ Deleted ${deletedItemHistory.count} item history records`);
    
    // Step 2: Delete all Item records
    console.log('Deleting items...');
    const deletedItems = await prisma.item.deleteMany({});
    console.log(`✅ Deleted ${deletedItems.count} items`);
    
    // Step 3: Delete all Store records
    console.log('Deleting stores...');
    const deletedStores = await prisma.store.deleteMany({});
    console.log(`✅ Deleted ${deletedStores.count} stores`);
    
    // Step 4: Delete all User records
    console.log('Deleting users...');
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ Deleted ${deletedUsers.count} users`);
    
    // Step 5: Delete all Organization records
    console.log('Deleting organizations...');
    const deletedOrganizations = await prisma.organization.deleteMany({});
    console.log(`✅ Deleted ${deletedOrganizations.count} organizations`);
    
    console.log('🎉 Database cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup function
cleanDatabase()
  .then(() => console.log('Script finished.'))
  .catch((error) => console.error('Script error:', error));
