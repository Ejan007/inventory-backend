# StockIT Email Service

The StockIT Email Service provides automated email notifications and alerts for inventory management. This document provides a quick reference for setting up and using the email service.

## Setup

1. **Configure Environment Variables**

   Copy `.env.example` to `.env` and update the email configuration.
   
   **For Gmail SMTP (Production):**

   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-gmail-account@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_SECURE=false
   EMAIL_FROM=your-gmail-account@gmail.com
   FRONTEND_URL=https://your-production-url.com
   ```
   
   **Gmail Setup Instructions:**
   
   1. Use a Gmail account for your application
   2. Enable 2-Step Verification in your Google Account security settings
   3. Generate an App Password at https://myaccount.google.com/apppasswords
   4. Select "Mail" as the app and your device type
   5. Use the generated 16-character password as EMAIL_PASSWORD
   
   **To test Gmail configuration:**
   
   ```
   npm run email:gmail-test
   ```

2. **For Testing (No Real Emails)**

   Create an Ethereal email test account:

   ```
   npm run email:ethereal
   ```

   Use the generated credentials in your `.env` file.

## Email Templates

Email templates are stored in the `/email-templates` directory:

- `low-stock-alert.html` - Low stock notifications
- `password-reset.html` - Password reset emails
- `welcome.html` - New user welcome emails
- `inventory-report.html` - Inventory reports

To test rendering of all templates:

```
npm run email:test
```

Rendered templates will be saved to `/email-test-output/`.

## Email API Endpoints

The service provides the following API endpoints:

- `POST /api/email/low-stock-alert` - Send low stock alerts
- `POST /api/email/password-reset` - Send password reset links
- `POST /api/email/welcome` - Send welcome emails to new users (no authentication required)
- `POST /api/email/inventory-report` - Send inventory reports
- `POST /api/email/custom` - Send custom emails
- `GET /api/email/stats?period=day` - Get email statistics (admin only)

All endpoints except `/welcome` and `/password-reset` require authentication.

## Testing Email Functionality

The service provides several test scripts:

```
# Basic template rendering test
npm run email:test

# To test previously failing endpoints (password reset and welcome)
npm run email:fix-test

# Comprehensive email service test 
npm run email:full-test

# Run all email tests in sequence
npm run email:run-all-tests

# Test Gmail SMTP configuration
npm run email:gmail-test

# Run an interactive demo of the email service
npm run email:demo
```

**Note:** The tests are configured to connect to the server on port 4000. If your server is running on a different port, update the port number in the test scripts.

To schedule automatic inventory checks, use the PowerShell script:

```powershell
# Daily check at 8:00 AM
.\Schedule-InventoryCheck.ps1 -Frequency Daily -Time "08:00"

# Hourly checks
.\Schedule-InventoryCheck.ps1 -Frequency Hourly
```

## Email Service Administration

For administrators, a simple admin tool is available:

```powershell
.\Email-Service-Admin.ps1
```

This tool provides a menu for common tasks like:
- Creating test accounts
- Testing templates
- Running inventory checks
- Scheduling automated tasks
- Viewing email logs

## Integrating with Other Code

To send emails from other parts of the application, use the email notifier utility:

```javascript
const emailNotifier = require('../utils/emailNotifier');

// Example: Send welcome email
const result = await emailNotifier.sendWelcomeEmail({
  recipient: 'user@example.com',
  name: 'John Doe',
  organizationName: 'ACME Inc'
});

if (result.success) {
  console.log('Welcome email sent successfully');
} else {
  console.error('Failed to send welcome email:', result.error);
}
```

## Logging

All email activity is logged to:
- `/logs/email-service.log` - All email activity
- `/logs/email-service-error.log` - Only failed emails

Logs are automatically rotated when they reach 5MB in size.
