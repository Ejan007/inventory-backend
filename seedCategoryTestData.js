const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to create sample data for testing category features
 */
async function seedCategoryTestData() {
  console.log('🌱 Seeding test data for categories...');
  
  try {
    // Find existing organization or create one
    let organization = await prisma.organization.findFirst();
    
    if (!organization) {
      console.log('Creating test organization...');
      organization = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          industry: 'OTHER',
          defaultCategories: ['Meat', 'Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Dry Goods', 'Frozen', 'Beverages', 'Other'],
          contactEmail: 'test@example.com',
          contactPhone: '123-456-7890',
          logoUrl: 'https://example.com/logo.png'
        }
      });
      console.log('Organization created:', organization.id);
    } else {
      console.log('Using existing organization:', organization.id);
    }
    
    // Find existing store or create one
    let store = await prisma.store.findFirst({
      where: { organizationId: organization.id }
    });
    
    if (!store) {
      console.log('Creating test store...');
      store = await prisma.store.create({
        data: {
          name: 'Test Store',
          address: '123 Test St, Testville',
          organizationId: organization.id
        }
      });
      console.log('Store created:', store.id);
    } else {
      console.log('Using existing store:', store.id);
    }
    
    // Create test items with different categories
    console.log('Creating test items with categories...');
    
    const categories = organization.defaultCategories || ['Meat', 'Vegetables', 'Fruits', 'Other'];
    const testItems = [
      { name: 'Beef Patties', category: 'Meat' },
      { name: 'Lettuce', category: 'Vegetables' },
      { name: 'Apples', category: 'Fruits' },
      { name: 'Cheese', category: 'Dairy' },
      { name: 'Bread', category: 'Bakery' }
    ];
    
    for (const item of testItems) {
      const existingItem = await prisma.item.findFirst({
        where: { 
          name: item.name,
          storeId: store.id
        }
      });
      
      if (!existingItem) {
        await prisma.item.create({
          data: {
            name: item.name,
            category: item.category,
            quantity: Math.floor(Math.random() * 50),
            mondayRequired: Math.floor(Math.random() * 10),
            tuesdayRequired: Math.floor(Math.random() * 10),
            wednesdayRequired: Math.floor(Math.random() * 10),
            thursdayRequired: Math.floor(Math.random() * 10),
            fridayRequired: Math.floor(Math.random() * 10),
            saturdayRequired: Math.floor(Math.random() * 10),
            sundayRequired: Math.floor(Math.random() * 10),
            storeId: store.id,
            organizationId: organization.id
          }
        });
        console.log(`Created item: ${item.name} (${item.category})`);
      } else {
        console.log(`Item ${item.name} already exists`);
      }
    }
    
    console.log('✅ Test data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedCategoryTestData()
  .then(() => console.log('Seeding script finished.'))
  .catch((error) => console.error('Seeding script error:', error));
