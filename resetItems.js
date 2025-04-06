const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetItems() {
  try {
    // Find the stores 'Phillip' and 'Kingstone'
    const stores = await prisma.store.findMany({
      where: {
        name: { in: ['Phillip', 'Kingstone'] },
      },
    });

    // Reset item values for each store
    for (const store of stores) {
      await prisma.item.updateMany({
        where: { storeId: store.id },
        data: {
          mondayRequired: 0,
          tuesdayRequired: 0,
          wednesdayRequired: 0,
          thursdayRequired: 0,
          fridayRequired: 0,
          saturdayRequired: 0,
          sundayRequired: 0,
        },
      });
    }

    console.log("Item values reset to zero for 'Phillip' and 'Kingstone'.");
  } catch (error) {
    console.error("Error resetting item values:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetItems();