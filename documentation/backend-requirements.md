# Email Service Backend Requirements

This document outlines the backend API requirements for the StockIT email service. The email functionality enables sending various types of notifications and alerts to users about inventory status.

## Required Endpoints

The following API endpoints need to be implemented on the backend to support email functionality:

### 1. Send Low Stock Alert

**Endpoint:** `POST /api/email/low-stock-alert`

**Description:** Sends email alerts when inventory items fall below required thresholds.

**Request Body:**
```json
{
  "recipient": ["email1@example.com", "email2@example.com"],
  "storeName": "Main Store",
  "items": [
    {
      "id": "123",
      "name": "Product Name",
      "quantity": 5,
      "required": 10,
      "shortage": 5
    }
  ],
  "urgent": true
}
```

### 2. Send Password Reset Email

**Endpoint:** `POST /api/email/password-reset`

**Description:** Sends password reset links to users.

**Request Body:**
```json
{
  "recipient": "user@example.com",
  "resetToken": "jwt-token-for-reset",
  "username": "Username"
}
```

### 3. Send Welcome Email

**Endpoint:** `POST /api/email/welcome`

**Description:** Sends welcome emails to new users.

**Request Body:**
```json
{
  "recipient": "newuser@example.com",
  "name": "User Name",
  "organizationName": "Organization Name"
}
```

### 4. Send Inventory Report

**Endpoint:** `POST /api/email/inventory-report`

**Description:** Sends inventory status reports with detailed information.

**Request Body:**
```json
{
  "recipient": ["manager@example.com"],
  "reportType": "Daily",
  "storeName": "Main Store",
  "categories": {
    "Bakery": {
      "name": "Bakery",
      "items": [
        {
          "name": "Bread",
          "quantity": 20,
          "required": 25,
          "isLow": true,
          "status": "Low Stock"
        }
      ]
    }
  },
  "recommendations": [
    "Order 5 items that are currently below required levels",
    "Regularly check the dashboard for real-time inventory updates"
  ]
}
```

### 5. Send Custom Email

**Endpoint:** `POST /api/email/custom`

**Description:** Sends custom emails with user-defined content.

**Request Body:**
```json
{
  "recipient": ["user@example.com"],
  "subject": "Custom Subject",
  "body": "<h2>HTML Email Content</h2><p>This is a custom message.</p>"
}
```

## Implementation Notes

### Nodemailer Setup

The recommended way to implement the email service is using Nodemailer with either:

1. SMTP configuration for a transactional email service like SendGrid, Mailgun, or Amazon SES
2. Direct integration with services that provide REST APIs

Example Nodemailer configuration:

```javascript
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Create transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Compile email template with handlebars
const compileTemplate = (templatePath, data) => {
  const templateSource = fs.readFileSync(path.join(__dirname, templatePath), 'utf8');
  const template = handlebars.compile(templateSource);
  return template(data);
};

// Example sending function
const sendEmail = async (to, subject, templatePath, data) => {
  const html = compileTemplate(templatePath, data);
  
  await transporter.sendMail({
    from: '"StockIT" <notifications@stockit.com>',
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html
  });
};
```

### Email Templates

HTML templates should be loaded from the file system and compiled with a template engine like Handlebars. 

**Template Locations:**
- For frontend reference: `src/components/email/templates/`
- For backend use: `src/email-templates/`

All templates include:
- `low-stock-alert.html` - For inventory alerts
- `password-reset.html` - For password reset links
- `welcome.html` - For new user onboarding
- `inventory-report.html` - For inventory status reports

A README.md file in the templates directory provides detailed documentation about the email templates system.

### Security Considerations

1. Never include sensitive information in email templates
2. Use JWT tokens with short expiration for password resets
3. Implement rate limiting to prevent abuse of email endpoints
4. Validate all input data, especially recipient email addresses
5. Store email templates securely and validate their contents before sending

### Testing

1. Set up a test email account for development
2. Use tools like Ethereal Email for local testing
3. Create unit tests for each email type
4. Implement visual testing of rendered email templates

## Frontend Integration

The frontend email service is implemented in `src/services/emailService.js` and uses Axios to communicate with these backend endpoints. Components like EmailAlerts and PasswordReset use this service to send emails.

## Configuration

Email configuration should be stored in environment variables:

```
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=user@example.com
EMAIL_PASSWORD=secretpassword
EMAIL_FROM=notifications@stockit.com
```