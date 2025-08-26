/**
 * Email Integration Test Script
 * 
 * This script tests the email templates with a real SMTP server using Ethereal
 * which is a fake SMTP service that captures emails instead of sending them.
 */
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '../email-templates');

// Sample data from testEmailTemplates.js
const sampleData = {
  'low-stock-alert.html': {
    storeName: 'Downtown Store',
    items: [
      { name: 'French Baguette', quantity: 5, required: 20, shortage: 15 },
      { name: 'Croissant', quantity: 3, required: 15, shortage: 12 },
      { name: 'Sourdough Loaf', quantity: 1, required: 10, shortage: 9 }
    ],
    urgent: true
  },
  'password-reset.html': {
    username: 'John Smith',
    resetUrl: 'https://stockit.app/reset-password?token=sample-jwt-token',
    resetToken: 'sample-jwt-token'
  },
  'welcome.html': {
    name: 'Jane Doe',
    organizationName: 'Bakery Plus Inc.'
  },
  'inventory-report.html': {
    reportType: 'Daily',
    storeName: 'Main Bakery',
    categories: [
      {
        name: 'Bakery',
        items: [
          { name: 'Bread', quantity: 20, required: 25, isLow: true, status: 'Low Stock' },
          { name: 'Pastries', quantity: 30, required: 20, isLow: false, status: 'In Stock' }
        ]
      },
      {
        name: 'Dairy',
        items: [
          { name: 'Milk', quantity: 5, required: 10, isLow: true, status: 'Low Stock' },
          { name: 'Butter', quantity: 15, required: 10, isLow: false, status: 'In Stock' }
        ]
      }
    ],
    recommendations: [
      'Order 5 more loaves of bread',
      'Order 5 more gallons of milk',
      'Consider reducing pastry production tomorrow'
    ],
    timestamp: new Date().toLocaleString()
  }
};

// Compile email template with Handlebars
const compileTemplate = async (templateName, data) => {
  try {
    const templatePath = path.join(TEMPLATE_DIR, templateName);
    const templateSource = await fs.promises.readFile(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    return template(data);
  } catch (error) {
    console.error(`Email template error (${templateName}):`, error);
    throw new Error(`Failed to compile email template: ${error.message}`);
  }
};

// Main test function
async function testEmailSending() {
  try {
    console.log('Creating Ethereal test account...');
    // Create a test account at Ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    
    console.log(`Test account created:`);
    console.log(` - Username: ${testAccount.user}`);
    console.log(` - Password: ${testAccount.pass}`);
    console.log(` - SMTP Host: ${testAccount.smtp.host}`);
    console.log(` - SMTP Port: ${testAccount.smtp.port}`);
    
    // Create a SMTP transporter using Ethereal
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    // Test each template
    for (const [templateName, data] of Object.entries(sampleData)) {
      console.log(`\nTesting ${templateName}...`);
      
      // Compile template
      const html = await compileTemplate(templateName, data);
      
      // Send test email
      const info = await transporter.sendMail({
        from: '"StockIT System" <test@stockit.com>',
        to: "test@recipient.com",
        subject: `Test: ${templateName}`,
        html: html
      });
      
      console.log(`Email sent: ${info.messageId}`);
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    console.log('\nAll email templates tested successfully!');
    console.log('Check the preview URLs to view the emails.');
  } catch (error) {
    console.error('Error during email testing:', error);
  }
}

// Run the test
testEmailSending();
