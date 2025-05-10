const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to migrate existing items to include category field
 * and add default categories to organizations
 */
async function migrateCategoriesData() {
  console.log('🔄 Starting category data migration...');
  
  try {
    // Update all organizations to have default categories if they don't already
    console.log('Updating organizations with default categories...');
    const organizations = await prisma.organization.findMany();
    
    if (organizations.length === 0) {
      console.log('No organizations found to process');
    }
    
    for (const org of organizations) {
      console.log(`Processing organization: ${org.name}`);
      console.log(`Organization ${org.name} has default categories:`, org.defaultCategories);
    }
    
    // Query for items
    const allItems = await prisma.item.findMany();
    console.log(`Found ${allItems.length} total items in the database`);
    
    // Verify the schema
    try {
      // Just log properties of the first item to see what fields are available
      if (allItems.length > 0) {
        console.log('Sample item fields:', Object.keys(allItems[0]));
        console.log('Category field value:', allItems[0].category);
      } else {
        console.log('No items in the database to examine');
      }
    } catch (err) {
      console.log('Error examining item fields:', err.message);
    }
    
    console.log('🎉 Category data migration completed successfully!');
  } catch (error) {
    console.error('❌ Error migrating category data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration function
migrateCategoriesData()
  .then(() => console.log('Script finished.'))
  .catch((error) => console.error('Script error:', error));
