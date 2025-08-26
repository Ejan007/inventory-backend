/**
 * Test script for password-reset and welcome email endpoints
 * 
 * This script tests the email endpoints that were previously failing
 * with 400 Bad Request errors.
 */
const axios = require('axios');
require('dotenv').config();

// Base URL for the API server (change if testing a different environment)
const BASE_URL = 'http://127.0.0.1:4000';

// Test data for password reset email
const passwordResetData = {
  recipient: "test@example.com",
  resetToken: "sample-reset-token-123",
  username: "TestUser"
};

// Test data for welcome email
const welcomeData = {
  recipient: "newuser@example.com",
  name: "New User",
  organizationName: "Test Company"
};

// Function to test password reset email
async function testPasswordResetEmail() {
  try {
    console.log('\nTesting password reset email endpoint...');
    
    const response = await axios.post(
      `${BASE_URL}/api/email/password-reset`,
      passwordResetData
    );
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('✅ Password reset email test completed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Password reset email test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    
    return false;
  }
}

// Function to test welcome email
async function testWelcomeEmail() {
  try {
    console.log('\nTesting welcome email endpoint...');
    
    const response = await axios.post(
      `${BASE_URL}/api/email/welcome`,
      welcomeData
    );
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('✅ Welcome email test completed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Welcome email test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    
    return false;
  }
}

// Main test function
async function runTests() {
  // Check command line arguments
  const args = process.argv.slice(2);
  const testWelcomeOnly = args.includes('--welcome-only');
  const testPasswordOnly = args.includes('--password-only');
  
  console.log('=== EMAIL ENDPOINT TESTS ===');
  console.log('Testing endpoints that were previously returning 400 Bad Request');
  
  let passwordResetSuccess = true;
  let welcomeSuccess = true;
  
  if (testWelcomeOnly) {
    // Only test welcome endpoint
    welcomeSuccess = await testWelcomeEmail();
  } else if (testPasswordOnly) {
    // Only test password reset endpoint
    passwordResetSuccess = await testPasswordResetEmail();
  } else {
    // Test both endpoints
    passwordResetSuccess = await testPasswordResetEmail();
    welcomeSuccess = await testWelcomeEmail();
  }
  
  console.log('\n=== TEST SUMMARY ===');
  
  if (!testPasswordOnly) {
    console.log(`Welcome Email: ${welcomeSuccess ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  if (!testWelcomeOnly) {
    console.log(`Password Reset Email: ${passwordResetSuccess ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  if (
    (testWelcomeOnly && welcomeSuccess) ||
    (testPasswordOnly && passwordResetSuccess) ||
    (passwordResetSuccess && welcomeSuccess)
  ) {
    console.log('\n✅ All tests passed! The email endpoints are now working correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run the tests
runTests();
