/**
 * StockIT Backend Utilities Menu
 * A central place to access all the utility scripts
 */
const readline = require('readline');
const { exec } = require('child_process');

// Create interface for reading user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// List of available utilities
const utilities = [
  { id: 1, name: 'Start Server', script: 'node index.js' },
  { id: 2, name: 'Test Categories', script: 'node scripts/testCategories.js' },
  { id: 3, name: 'Seed Category Test Data', script: 'node scripts/seedCategoryTestData.js' },
  { id: 4, name: 'Migrate Categories Data', script: 'node scripts/migrateCategoriesData.js' },
  { id: 5, name: 'Reset Items', script: 'node scripts/resetItems.js' },
  { id: 6, name: 'View Database', script: 'node scripts/viewDatabase.js' },
  { id: 7, name: 'Clean Database', script: 'node scripts/cleanDatabase.js' },  { id: 8, name: 'Apply Migrations', script: 'npx prisma migrate deploy' },
  { id: 9, name: 'Generate Prisma Client', script: 'npx prisma generate' },
  { id: 10, name: 'Open Prisma Studio', script: 'npx prisma studio' },
  { id: 11, name: 'View Documentation', script: 'start "" "documentation.md"' },
  { id: 0, name: 'Exit', script: null }
];

// Display menu
function displayMenu() {
  console.log('\n===== StockIT Backend Utilities =====');
  utilities.forEach(util => {
    console.log(`${util.id}. ${util.name}`);
  });
  console.log('====================================');
  
  rl.question('Choose an option: ', (answer) => {
    const option = parseInt(answer);
    
    // Validate input
    if (isNaN(option) || option < 0 || option > utilities.length - 1) {
      console.log('Invalid option. Please try again.');
      displayMenu();
      return;
    }
    
    // Handle exit
    if (option === 0) {
      console.log('Exiting...');
      rl.close();
      return;
    }
    
    // Run the selected utility
    const selectedUtil = utilities.find(util => util.id === option);
    console.log(`\nRunning: ${selectedUtil.name}...`);
    
    const child = exec(selectedUtil.script);
    
    child.stdout.on('data', (data) => {
      console.log(data);
    });
    
    child.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });
    
    child.on('close', (code) => {
      console.log(`\nProcess exited with code ${code}`);
      
      // For server process, don't return to menu
      if (option === 1) {
        rl.close();
        return;
      }
      
      // Return to menu for other utilities
      rl.question('\nPress Enter to return to menu...', () => {
        displayMenu();
      });
    });
  });
}

// Start the menu
console.log('Welcome to StockIT Backend Utilities!');
displayMenu();
