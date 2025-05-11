/**
 * Email Service Integration Test
 * 
 * This script tests all email service endpoints with proper data to verify functionality.
 * It helps identify any issues with the email service implementation.
 */
const axios = require('axios');
const { sendWelcomeEmail, sendPasswordResetEmail, sendLowStockAlert, sendInventoryReportEmail } = require('../utils/emailNotifier');
require('dotenv').config();

// Base URL for direct API calls
const BASE_URL = `http://127.0.0.1:${process.env.PORT || 4000}/api/email`;

// Test data for all endpoints
const testData = {
  welcome: {
    recipient: "test.user@example.com",
    name: "Test User",
    organizationName: "Test Organization"
  },
  passwordReset: {
    recipient: "password.reset@example.com",
    resetToken: "test-reset-token-xyz-123",
    username: "ResetUser"
  },
  lowStockAlert: {
    recipient: "inventory.manager@example.com",
    storeName: "Test Store",
    items: [
      { name: "Test Product 1", quantity: 3, required: 10, shortage: 7 },
      { name: "Test Product 2", quantity: 5, required: 15, shortage: 10 }
    ],
    urgent: true
  },
  inventoryReport: {
    recipient: "report.user@example.com",
    reportType: "Weekly",
    storeName: "Main Test Store",
    categories: {
      category1: {
        name: "Test Category 1",
        items: [
          { name: "Item 1", quantity: 20, required: 15, isLow: false, status: "In Stock" },
          { name: "Item 2", quantity: 5, required: 10, isLow: true, status: "Low Stock" }
        ]
      },
      category2: {
        name: "Test Category 2", 
        items: [
          { name: "Item 3", quantity: 0, required: 5, isLow: true, status: "Out of Stock" }
        ]
      }
    },
    recommendations: [
      "Order more of Item 2",
      "Immediately restock Item 3"
    ]
  },
  custom: {
    recipient: "custom.email@example.com",
    subject: "Test Custom Email",
    body: "<h1>Custom Email Test</h1><p>This is a test of the custom email functionality.</p>"
  }
};

// Get JWT token for authenticated endpoints
async function getAuthToken() {
  try {
    // Replace with valid login credentials for testing
    const authResponse = await axios.post(`http://localhost:${process.env.PORT || 3000}/api/auth/login`, {
      email: process.env.TEST_USER_EMAIL || 'admin@example.com',
      password: process.env.TEST_USER_PASSWORD || 'password123'
    });
    
    return authResponse.data.token;
  } catch (error) {
    console.error('Failed to authenticate for testing:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}

// Test direct API access
async function testDirectApi() {
  console.log('=== TESTING DIRECT API ACCESS ===');
  
  // Test welcome endpoint (no auth required)
  try {
    console.log('\nTesting Welcome Email API...');
    const response = await axios.post(`${BASE_URL}/welcome`, testData.welcome);
    console.log('✅ Welcome email sent successfully:', response.data.messageId);
  } catch (error) {
    console.error('❌ Welcome email test failed:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
  
  // Test password reset endpoint (no auth required)
  try {
    console.log('\nTesting Password Reset Email API...');
    const response = await axios.post(`${BASE_URL}/password-reset`, testData.passwordReset);
    console.log('✅ Password reset email sent successfully:', response.data.messageId);
  } catch (error) {
    console.error('❌ Password reset email test failed:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
  
  // Get auth token for authenticated endpoints
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ Skipping authenticated tests - failed to get auth token');
    return;
  }
  
  // Test authenticated endpoints
  try {
    console.log('\nTesting Low Stock Alert Email API...');
    const response = await axios.post(`${BASE_URL}/low-stock-alert`, testData.lowStockAlert, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Low stock alert email sent successfully:', response.data.messageId);
  } catch (error) {
    console.error('❌ Low stock alert email test failed:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
  
  try {
    console.log('\nTesting Inventory Report Email API...');
    const response = await axios.post(`${BASE_URL}/inventory-report`, testData.inventoryReport, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Inventory report email sent successfully:', response.data.messageId);
  } catch (error) {
    console.error('❌ Inventory report email test failed:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
  
  try {
    console.log('\nTesting Custom Email API...');
    const response = await axios.post(`${BASE_URL}/custom`, testData.custom, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Custom email sent successfully:', response.data.messageId);
  } catch (error) {
    console.error('❌ Custom email test failed:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Test utility functions
async function testUtilityFunctions() {
  console.log('\n=== TESTING UTILITY FUNCTIONS ===');
  
  // Test welcome email utility
  try {
    console.log('\nTesting Welcome Email Utility...');
    const result = await sendWelcomeEmail(testData.welcome);
    if (result.success) {
      console.log('✅ Welcome email sent successfully via utility');
    } else {
      console.error('❌ Welcome email utility failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Welcome email utility exception:', error.message);
  }
  
  // Test password reset email utility
  try {
    console.log('\nTesting Password Reset Email Utility...');
    const result = await sendPasswordResetEmail(testData.passwordReset);
    if (result.success) {
      console.log('✅ Password reset email sent successfully via utility');
    } else {
      console.error('❌ Password reset email utility failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Password reset email utility exception:', error.message);
  }
  
  // Test low stock alert email utility - requires auth
  try {
    console.log('\nTesting Low Stock Alert Email Utility...');
    const result = await sendLowStockAlert(testData.lowStockAlert);
    if (result.success) {
      console.log('✅ Low stock alert email sent successfully via utility');
    } else {
      console.error('❌ Low stock alert email utility failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Low stock alert email utility exception:', error.message);
  }
  
  // Test inventory report email utility - requires auth
  try {
    console.log('\nTesting Inventory Report Email Utility...');
    const result = await sendInventoryReportEmail(testData.inventoryReport);
    if (result.success) {
      console.log('✅ Inventory report email sent successfully via utility');
    } else {
      console.error('❌ Inventory report email utility failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Inventory report email utility exception:', error.message);
  }
}

// Main function
async function main() {
  console.log('====================================');
  console.log('EMAIL SERVICE INTEGRATION TEST');
  console.log('Testing all email endpoints and utilities');
  console.log('====================================\n');
  
  // Test direct API access first
  await testDirectApi();
  
  // Then test utility functions that wrap API calls
  await testUtilityFunctions();
  
  console.log('\n====================================');
  console.log('EMAIL SERVICE TEST COMPLETE');
  console.log('====================================');
}

// Run the tests
main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
