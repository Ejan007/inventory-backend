/**
 * Gmail SMTP Test Script
 * 
 * This script tests the email service with Gmail SMTP.
 * It sends a simple test email to verify that your Gmail SMTP settings are correct.
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

// Create a test transporter using Gmail SMTP settings from .env
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Recipient email for the test (you can replace this with any email address)
const testEmail = process.env.EMAIL_USER; // Default to sending to yourself

// Function to send a test email
async function sendTestEmail() {
  console.log('Testing Gmail SMTP configuration...');
  console.log(`Using SMTP host: ${process.env.EMAIL_HOST}`);
  console.log(`Using email: ${process.env.EMAIL_USER}`);
  
  try {
    // Send the test email
    const info = await transporter.sendMail({
      from: `"StockIT System" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: 'StockIT Email Service Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #333;">StockIT Email Service Test</h2>
          <p>This is a test email from your StockIT system.</p>
          <p>If you received this email, your Gmail SMTP configuration is working correctly!</p>
          <p>Configuration details:</p>
          <ul>
            <li>SMTP Host: ${process.env.EMAIL_HOST}</li>
            <li>SMTP Port: ${process.env.EMAIL_PORT}</li>
            <li>From: ${process.env.EMAIL_FROM}</li>
          </ul>
          <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777;">
            This is an automated test message from the StockIT email service.
          </p>
        </div>
      `
    });
    
    console.log('✅ Test email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    
    // For Gmail, provide a link to check the email
    console.log('\nYou should receive the test email in your Gmail inbox shortly.');
    console.log('Check your email at: https://mail.google.com');
    
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error(error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check that your Gmail username and password are correct');
    console.log('2. Make sure you\'re using an App Password if you have 2-Step Verification enabled');
    console.log('3. Check that less secure app access is enabled if not using App Password');
    console.log('4. Verify that your Gmail account doesn\'t have any security blocks');
  }
}

// Run the test
sendTestEmail();
