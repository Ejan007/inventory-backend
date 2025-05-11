// viewDatabase.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function viewDatabase() {
  try {
    console.log('--- USERS ---');
    const users = await prisma.user.findMany();
    console.table(users.map(u => ({ id: u.id, email: u.email, role: u.role })));

    console.log('\n--- STORES ---');
    const stores = await prisma.store.findMany();
    console.table(stores);

    console.log('\n--- ITEMS (first 10) ---');
    const items = await prisma.item.findMany({ take: 10 });
    console.table(items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      storeId: item.storeId
    })));

    console.log('\n--- HISTORY (latest 10) ---');
    const history = await prisma.itemHistory.findMany({ 
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: { item: true }
    });
    console.table(history.map(h => ({
      id: h.id,
      itemName: h.item.name,
      quantity: h.quantity,
      updatedBy: h.updatedBy,
      updatedAt: h.updatedAt
    })));

  } catch (error) {
    console.error('Error viewing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

viewDatabase();