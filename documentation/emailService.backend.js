/**
 * Email Service Backend Sample Implementation
 * 
 * This file provides a complete example of how to implement the email service
 * on the backend. It includes all the necessary endpoints and utility functions.
 */

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Configure rate limiting to prevent abuse
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { success: false, message: 'Too many email requests, please try again later' }
});

// Apply rate limiting to all email routes
router.use(emailLimiter);

// Create email transporter with environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Template directory path - using the src/email-templates directory
const TEMPLATE_DIR = path.join(__dirname, '../../email-templates');

/**
 * Compile email template with Handlebars
 * @param {string} templateName - Template filename
 * @param {Object} data - Data to inject into template
 * @returns {Promise<string>} - Compiled HTML
 */
const compileTemplate = async (templateName, data) => {
  try {
    const templatePath = path.join(TEMPLATE_DIR, templateName);
    const templateSource = await fs.promises.readFile(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    
    // Add common variables to all templates
    const commonData = {
      appName: process.env.APP_NAME || 'StockIT',
      logoUrl: process.env.LOGO_URL || 'https://yourdomain.com/logo.png',
      dashboardUrl: process.env.DASHBOARD_URL || 'https://yourdomain.com/dashboard',
      currentYear: new Date().getFullYear(),
      ...data
    };
    
    return template(commonData);
  } catch (error) {
    console.error(`Error compiling template ${templateName}:`, error);
    throw new Error(`Failed to compile email template: ${error.message}`);
  }
};

/**
 * Send email with compiled template
 * @param {string|string[]} to - Recipient(s) email
 * @param {string} subject - Email subject
 * @param {string} html - Compiled HTML content
 * @returns {Promise<Object>} - Send result
 */
const sendEmail = async (to, subject, html) => {
  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"StockIT" <notifications@stockit.com>',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html
    });
    
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Low Stock Alert Email
 * Sends alerts when inventory items fall below required thresholds
 */
router.post('/low-stock-alert', async (req, res) => {
  try {
    // Validate input
    const { recipient, storeName, items, urgent } = req.body;
    
    if (!recipient || !Array.isArray(recipient) || recipient.length === 0) {
      return res.status(400).json({ success: false, message: 'Recipients must be a non-empty array' });
    }
    
    if (!storeName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }
    
    // Compile template and send email
    const html = await compileTemplate('low-stock-alert.html', { 
      storeName, 
      items, 
      urgent 
    });
    
    const result = await sendEmail(recipient, 'Low Stock Alert - Action Required', html);
    
    res.status(200).json({ 
      success: true, 
      message: 'Low stock alert email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending low stock alert:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Password Reset Email
 * Sends password reset links to users
 */
router.post('/password-reset', async (req, res) => {
  try {
    // Validate input
    const { recipient, resetToken, username } = req.body;
    
    if (!recipient || !resetToken) {
      return res.status(400).json({ success: false, message: 'Email and reset token are required' });
    }
    
    // Create reset URL
    const resetUrl = `${process.env.APP_URL || 'https://yourdomain.com'}/reset-password?token=${resetToken}`;
    
    // Compile template and send email
    const html = await compileTemplate('password-reset.html', {
      resetUrl,
      username: username || 'User',
      expiryTime: '1 hour'
    });
    
    const result = await sendEmail(recipient, 'Reset Your Password', html);
    
    res.status(200).json({ 
      success: true, 
      message: 'Password reset email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Welcome Email
 * Sends welcome emails to new users
 */
router.post('/welcome', async (req, res) => {
  try {
    // Validate input
    const { recipient, name, organizationName } = req.body;
    
    if (!recipient || !name) {
      return res.status(400).json({ success: false, message: 'Email and name are required' });
    }
    
    // Create login URL
    const loginUrl = `${process.env.APP_URL || 'https://yourdomain.com'}/login`;
    
    // Compile template and send email
    const html = await compileTemplate('welcome.html', {
      name,
      organizationName: organizationName || 'StockIT',
      loginUrl,
      email: recipient
    });
    
    const result = await sendEmail(recipient, 'Welcome to StockIT!', html);
    
    res.status(200).json({ 
      success: true, 
      message: 'Welcome email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Inventory Report Email
 * Sends inventory status reports with detailed information
 */
router.post('/inventory-report', async (req, res) => {
  try {
    // Validate input
    const { recipient, reportType, storeName, categories, recommendations } = req.body;
    
    if (!recipient || !reportType || !storeName || !categories) {
      return res.status(400).json({ success: false, message: 'Required data missing' });
    }
    
    // Format categories for the template
    const formattedCategories = Object.values(categories);
    
    // Today's date formatted
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Compile template and send email
    const html = await compileTemplate('inventory-report.html', {
      reportType,
      storeName,
      categories: formattedCategories,
      recommendations: recommendations || [],
      date,
      totalItems: formattedCategories.reduce((sum, cat) => sum + cat.items.length, 0),
      lowStockItems: formattedCategories.reduce((sum, cat) => {
        return sum + cat.items.filter(item => item.isLow).length;
      }, 0),
      storeId: req.body.storeId || 'Unknown',
      storeManager: req.body.storeManager || 'Not specified',
      storeContact: req.body.storeContact || 'Not specified'
    });
    
    const result = await sendEmail(
      recipient, 
      `${reportType} Inventory Report - ${storeName}`, 
      html
    );
    
    res.status(200).json({ 
      success: true, 
      message: 'Inventory report email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending inventory report email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Custom Email
 * Sends custom emails with user-defined content
 */
router.post('/custom', async (req, res) => {
  try {
    // Validate input
    const { recipient, subject, body } = req.body;
    
    if (!recipient || !subject || !body) {
      return res.status(400).json({ success: false, message: 'Recipient, subject and body are required' });
    }
    
    // Sanitize HTML (in a real implementation, you'd use a library like DOMPurify)
    const sanitizedBody = body; // Replace with actual sanitization
    
    const result = await sendEmail(recipient, subject, sanitizedBody);
    
    res.status(200).json({ 
      success: true, 
      message: 'Custom email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending custom email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Test route for email service health check
 */
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Email service is running'
  });
});

module.exports = router;