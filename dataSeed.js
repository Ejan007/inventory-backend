// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Delete existing data to avoid collisions
  await prisma.itemHistory.deleteMany();
  await prisma.item.deleteMany();
  await prisma.store.deleteMany();

  // Create the stores
  const storeNames = ['Tuggernong', 'Fyswick', 'Phillip', 'Kingstone'];
  const stores = {};
  for (const name of storeNames) {
    const store = await prisma.store.create({
      data: { name },
    });
    stores[name] = store;
  }

  // Define the items data (using the Mon-Wed numbers as baseline)
  const itemsData = [
    {
      name: "Big Bun",
      quantity: 0,
      mondayRequired: 400,
      tuesdayRequired: 400,
      wednesdayRequired: 400,
      thursdayRequired: 400,
      fridayRequired: 400,
      saturdayRequired: 400,
      sundayRequired: 400,
    },
    {
      name: "Baby Bun",
      quantity: 0,
      mondayRequired: 200,
      tuesdayRequired: 200,
      wednesdayRequired: 200,
      thursdayRequired: 200,
      fridayRequired: 200,
      saturdayRequired: 200,
      sundayRequired: 200,
    },
    {
      name: "Dog Bun",
      quantity: 0,
      mondayRequired: 100,
      tuesdayRequired: 100,
      wednesdayRequired: 100,
      thursdayRequired: 100,
      fridayRequired: 100,
      saturdayRequired: 100,
      sundayRequired: 100,
    },
    {
      name: "Big Beef",
      quantity: 0,
      mondayRequired: 12,
      tuesdayRequired: 12,
      wednesdayRequired: 12,
      thursdayRequired: 12,
      fridayRequired: 12,
      saturdayRequired: 12,
      sundayRequired: 12,
    },
    {
      name: "Baby Beef",
      quantity: 0,
      mondayRequired: 3,
      tuesdayRequired: 3,
      wednesdayRequired: 3,
      thursdayRequired: 3,
      fridayRequired: 3,
      saturdayRequired: 3,
      sundayRequired: 3,
    },
    {
      name: "Hot Dog Packets",
      quantity: 0,
      mondayRequired: 10,
      tuesdayRequired: 10,
      wednesdayRequired: 10,
      thursdayRequired: 10,
      fridayRequired: 10,
      saturdayRequired: 10,
      sundayRequired: 10,
    },
    {
      name: "Bn Tomato",
      quantity: 0,
      mondayRequired: 7,
      tuesdayRequired: 7,
      wednesdayRequired: 7,
      thursdayRequired: 7,
      fridayRequired: 7,
      saturdayRequired: 7,
      sundayRequired: 7,
    },
    {
      name: "Bn Onion",
      quantity: 0,
      mondayRequired: 6,
      tuesdayRequired: 6,
      wednesdayRequired: 6,
      thursdayRequired: 6,
      fridayRequired: 6,
      saturdayRequired: 6,
      sundayRequired: 6,
    },
    {
      name: "Avo",
      quantity: 0,
      mondayRequired: 2,
      tuesdayRequired: 2,
      wednesdayRequired: 2,
      thursdayRequired: 2,
      fridayRequired: 2,
      saturdayRequired: 2,
      sundayRequired: 2,
    },
    {
      name: "Mushrooms",
      quantity: 0,
      mondayRequired: 2,
      tuesdayRequired: 2,
      wednesdayRequired: 2,
      thursdayRequired: 2,
      fridayRequired: 2,
      saturdayRequired: 2,
      sundayRequired: 2,
    },
    {
      name: "Egg And Zucchini",
      quantity: 0,
      mondayRequired: 2,
      tuesdayRequired: 2,
      wednesdayRequired: 2,
      thursdayRequired: 2,
      fridayRequired: 2,
      saturdayRequired: 2,
      sundayRequired: 2,
    },
    {
      name: "Cap",
      quantity: 0,
      mondayRequired: 2,
      tuesdayRequired: 2,
      wednesdayRequired: 2,
      thursdayRequired: 2,
      fridayRequired: 2,
      saturdayRequired: 2,
      sundayRequired: 2,
    },
    {
      name: "Slaw",
      quantity: 0,
      mondayRequired: 1,
      tuesdayRequired: 1,
      wednesdayRequired: 1,
      thursdayRequired: 1,
      fridayRequired: 1,
      saturdayRequired: 1,
      sundayRequired: 1,
    },
    {
      name: "Cooked Wings",
      quantity: 0,
      mondayRequired: 4,
      tuesdayRequired: 4,
      wednesdayRequired: 4,
      thursdayRequired: 4,
      fridayRequired: 4,
      saturdayRequired: 4,
      sundayRequired: 4,
    },
    {
      name: "Chicken",
      quantity: 0,
      mondayRequired: 2,
      tuesdayRequired: 2,
      wednesdayRequired: 2,
      thursdayRequired: 2,
      fridayRequired: 2,
      saturdayRequired: 2,
      sundayRequired: 2,
    },
    {
      name: "Schnitzel",
      quantity: 0,
      mondayRequired: 6,
      tuesdayRequired: 6,
      wednesdayRequired: 6,
      thursdayRequired: 6,
      fridayRequired: 6,
      saturdayRequired: 6,
      sundayRequired: 6,
    },
    {
      name: "Mixed Lettuce",
      quantity: 0,
      mondayRequired: 6,
      tuesdayRequired: 6,
      wednesdayRequired: 6,
      thursdayRequired: 6,
      fridayRequired: 6,
      saturdayRequired: 6,
      sundayRequired: 6,
    },
    {
      name: "Box Iceberg Lettuce",
      quantity: 0,
      mondayRequired: 1,
      tuesdayRequired: 1,
      wednesdayRequired: 1,
      thursdayRequired: 1,
      fridayRequired: 1,
      saturdayRequired: 1,
      sundayRequired: 1,
    },
    {
      name: "Cucumbers",
      quantity: 0,
      mondayRequired: 5,
      tuesdayRequired: 5,
      wednesdayRequired: 5,
      thursdayRequired: 5,
      fridayRequired: 5,
      saturdayRequired: 5,
      sundayRequired: 5,
    },
    {
      name: "Aioli",
      quantity: 0,
      mondayRequired: 3,
      tuesdayRequired: 3,
      wednesdayRequired: 3,
      thursdayRequired: 3,
      fridayRequired: 3,
      saturdayRequired: 3,
      sundayRequired: 3,
    },
    {
      name: "Mayo",
      quantity: 0,
      mondayRequired: 3,
      tuesdayRequired: 3,
      wednesdayRequired: 3,
      thursdayRequired: 3,
      fridayRequired: 3,
      saturdayRequired: 3,
      sundayRequired: 3,
    },
    {
      name: "Piri",
      quantity: 0,
      mondayRequired: 1,
      tuesdayRequired: 1,
      wednesdayRequired: 1,
      thursdayRequired: 1,
      fridayRequired: 1,
      saturdayRequired: 1,
      sundayRequired: 1,
    },
    {
      name: "Vegan Aoli",
      quantity: 0,
      mondayRequired: 1,
      tuesdayRequired: 1,
      wednesdayRequired: 1,
      thursdayRequired: 1,
      fridayRequired: 1,
      saturdayRequired: 1,
      sundayRequired: 1,
    },
    {
      name: "Dressing",
      quantity: 0,
      mondayRequired: 1,
      tuesdayRequired: 1,
      wednesdayRequired: 1,
      thursdayRequired: 1,
      fridayRequired: 1,
      saturdayRequired: 1,
      sundayRequired: 1,
    },
    {
      name: "Shallots",
      quantity: 0,
      mondayRequired: 5,
      tuesdayRequired: 5,
      wednesdayRequired: 5,
      thursdayRequired: 5,
      fridayRequired: 5,
      saturdayRequired: 5,
      sundayRequired: 5,
    },
    {
      name: "Sweet Potato",
      quantity: 0,
      mondayRequired: 5,
      tuesdayRequired: 5,
      wednesdayRequired: 5,
      thursdayRequired: 5,
      fridayRequired: 5,
      saturdayRequired: 5,
      sundayRequired: 5,
    },
    {
      name: "Brown Onions",
      quantity: 0,
      mondayRequired: 5,
      tuesdayRequired: 5,
      wednesdayRequired: 5,
      thursdayRequired: 5,
      fridayRequired: 5,
      saturdayRequired: 5,
      sundayRequired: 5,
    },
  ];

  // For each store, create items using the same itemsData
  for (const storeName of Object.keys(stores)) {
    const store = stores[storeName];
    for (const item of itemsData) {
      await prisma.item.create({
        data: {
          ...item,
          storeId: store.id,
        },
      });
    }
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
