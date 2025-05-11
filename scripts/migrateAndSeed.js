const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Run migrations
    console.log('Running migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    
    // Run seed.js to create users
    console.log('Creating default users...');
    require('./seed');
    
    // Wait a bit to ensure users are created before proceeding
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run dataSeed.js to create store items
    console.log('Creating store items...');
    require('./dataSeed');
    
    console.log('Migration and seeding completed successfully!');
  } catch (error) {
    console.error('Error during migration and seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 