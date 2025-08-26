/**
 * Ethereal Email Account Generator
 * 
 * This script generates a temporary Ethereal email account for testing the email service.
 * Ethereal is a fake SMTP service that captures emails instead of sending them.
 * This is useful for testing without sending real emails.
 * 
 * Run with: npm run ethereal:create
 */
const nodemailer = require('nodemailer');

async function createEtherealAccount() {
  console.log('Creating Ethereal email test account...');
  
  try {
    // Generate a new Ethereal account
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('\n✅ Ethereal Email account created successfully!\n');
    console.log('Use these credentials in your .env file:\n');
    console.log('EMAIL_HOST=smtp.ethereal.email');
    console.log(`EMAIL_PORT=587`);
    console.log(`EMAIL_USER=${testAccount.user}`);
    console.log(`EMAIL_PASSWORD=${testAccount.pass}`);
    console.log('EMAIL_SECURE=false');
    
    console.log('\nView received emails at:');
    console.log(`https://ethereal.email/login`);
    console.log('Login with the EMAIL_USER and EMAIL_PASSWORD above\n');
    
  } catch (error) {
    console.error('Error creating Ethereal account:', error);
  }
}

// Run the function
createEtherealAccount();
