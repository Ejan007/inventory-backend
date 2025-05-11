const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

// This script helps deploy database migrations to production
async function deployMigrations() {
  try {
    console.log('📡 Deploying Prisma migrations to production...');
    
    // Deploy the migrations to the production database
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    
    console.log('✅ Migrations deployed successfully');
    
    // Verify the database schema
    const prisma = new PrismaClient();
    
    try {
      // Test a query that includes the organization relation
      const testUser = await prisma.user.findFirst({
        include: { organization: true }
      });
      
      console.log('✅ Database schema verification successful');
      console.log(`Found user: ${testUser ? testUser.email : 'No users found'}`);
      
      if (testUser && testUser.organization) {
        console.log(`Organization: ${testUser.organization.name}`);
      } else if (testUser) {
        console.log('User has no associated organization');
      }
    } catch (error) {
      console.error('❌ Schema verification failed:', error.message);
    } finally {
      await prisma.$disconnect();
    }
    
  } catch (error) {
    console.error('❌ Migration deployment failed:', error.message);
    process.exit(1);
  }
}

deployMigrations();