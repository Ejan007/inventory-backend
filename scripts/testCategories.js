const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to test category-related functionality
 */
async function testCategories() {
  console.log('🔍 Testing category implementation...');
  
  try {
    // 1. Check organization schema
    console.log('Checking organization schema...');
    const organization = await prisma.organization.findFirst();
    if (!organization) {
      console.log('No organizations found');
      return;
    }
    
    console.log('Organization fields:', Object.keys(organization));
    console.log('defaultCategories:', organization.defaultCategories);
    console.log('contactEmail:', organization.contactEmail);
    console.log('contactPhone:', organization.contactPhone);
    console.log('logoUrl:', organization.logoUrl);
    
    // 2. Check item schema
    console.log('\nChecking item schema...');
    const item = await prisma.item.findFirst();
    if (!item) {
      console.log('No items found');
    } else {
      console.log('Item fields:', Object.keys(item));
      console.log('category:', item.category);
    }
    
    // 3. Check store schema
    console.log('\nChecking store schema...');
    const store = await prisma.store.findFirst();
    if (!store) {
      console.log('No stores found');
    } else {
      console.log('Store fields:', Object.keys(store));
      console.log('address:', store.address);
    }
    
    console.log('\n✅ Schema validation completed');
  } catch (error) {
    console.error('❌ Error testing categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCategories()
  .then(() => console.log('Test script finished.'))
  .catch((error) => console.error('Script error:', error));
