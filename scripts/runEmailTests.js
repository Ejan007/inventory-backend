/**
 * Email Service Test Runner
 * 
 * This script runs multiple email service tests sequentially to verify all functionality
 */
const path = require('path');
const { spawn } = require('child_process');

const TESTS = [
  { name: 'Basic Template Rendering', script: 'testEmailTemplates.js' },
  { name: 'Failing Endpoints Fixed Test', script: 'testFailingEndpoints.js' },
  { name: 'Complete Email Service Integration Test', script: 'testEmailService.js' }
];

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

function runTest(testInfo) {
  return new Promise((resolve, reject) => {
    console.log('\n');
    console.log(colors.bold + colors.blue + '='.repeat(50) + colors.reset);
    console.log(colors.bold + colors.blue + `RUNNING TEST: ${testInfo.name}` + colors.reset);
    console.log(colors.bold + colors.blue + `Script: ${testInfo.script}` + colors.reset);
    console.log(colors.bold + colors.blue + '='.repeat(50) + colors.reset);
    console.log('\n');

    const testProcess = spawn('node', [path.join(__dirname, testInfo.script)], {
      stdio: 'inherit'
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n');
        console.log(colors.bold + colors.green + '✓ Test completed successfully' + colors.reset);
        resolve();
      } else {
        console.log('\n');
        console.log(colors.bold + colors.red + `✗ Test failed with exit code ${code}` + colors.reset);
        // Don't reject, we want to run all tests even if some fail
        resolve();
      }
    });

    testProcess.on('error', (err) => {
      console.error(colors.bold + colors.red + 'Failed to start test process: ' + err.message + colors.reset);
      // Don't reject, we want to run all tests even if some fail
      resolve();
    });
  });
}

async function runAllTests() {
  console.log(colors.bold + colors.magenta + '='.repeat(70) + colors.reset);
  console.log(colors.bold + colors.magenta + ' STOCKIT EMAIL SERVICE TEST SUITE ' + colors.reset);
  console.log(colors.bold + colors.magenta + '='.repeat(70) + colors.reset);
  
  console.log(colors.cyan + 'Running all email service tests to verify functionality' + colors.reset);
  console.log(colors.cyan + `Total tests: ${TESTS.length}` + colors.reset);
  
  // Run each test in sequence
  for (let i = 0; i < TESTS.length; i++) {
    const testInfo = TESTS[i];
    console.log(colors.yellow + `\nTest ${i+1}/${TESTS.length}: ${testInfo.name}` + colors.reset);
    await runTest(testInfo);
  }
  
  console.log('\n');
  console.log(colors.bold + colors.green + '='.repeat(70) + colors.reset);
  console.log(colors.bold + colors.green + ' ALL TESTS COMPLETED ' + colors.reset);
  console.log(colors.bold + colors.green + '='.repeat(70) + colors.reset);
}

// Run all tests
runAllTests().catch(err => {
  console.error(colors.bold + colors.red + 'Test runner error:' + err.message + colors.reset);
  process.exit(1);
});
