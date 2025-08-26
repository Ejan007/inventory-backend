const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkItem() {
  try {
    const item = await prisma.item.findFirst();
    console.log('Item:', item);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

checkItem();
