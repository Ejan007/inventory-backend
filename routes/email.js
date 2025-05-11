/**
 * Email Service Routes
 */
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware');
const { logEmailActivity } = require('../utils/emailLogger');

// Configure rate limiter
const emailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 email requests per windowMs
  message: { 
    success: false, 
    error: 'Too many email requests, please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Create email transporter based on environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  // Gmail specific settings for better deliverability
  tls: {
    rejectUnauthorized: false // Helps with some certificate issues
  }
});

// Set email templates directory path
const TEMPLATE_DIR = path.join(__dirname, '../email-templates');

// Maximum number of recipients allowed per email
const MAX_RECIPIENTS = 20;

/**
 * Basic HTML sanitizer to prevent XSS attacks in custom emails
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
const sanitizeHtml = (html) => {
  if (!html) return '';
  
  // Replace potentially dangerous tags
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/on\w+=\w+/gi, '');
};

/**
 * Validate email recipients
 * @param {string|string[]} recipients - Email recipients
 * @returns {boolean} - Whether recipients are valid
 */
const validateRecipients = (recipients) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (Array.isArray(recipients)) {
    // Check if number of recipients exceeds the maximum allowed
    if (recipients.length > MAX_RECIPIENTS) {
      return false;
    }
    return recipients.every(email => emailPattern.test(email));
  } else if (typeof recipients === 'string') {
    // Handle single email address as string
    return emailPattern.test(recipients);
  }
  
  return false;
};

/**
 * Log email activity for monitoring and auditing
 * @param {string} type - Email type
 * @param {string|string[]} recipients - Email recipients
 * @param {string} userId - ID of user sending the email (if authenticated)
 * @param {boolean} success - Whether email was sent successfully
 * @param {string} [errorMessage] - Error message if email failed
 */

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
    return template(data);
  } catch (error) {
    console.error(`Email template error (${templateName}):`, error);
    throw new Error(`Failed to compile email template: ${error.message}`);
  }
};

/**
 * Send email with compiled template
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Send result
 */
const sendEmail = async (options) => {
  const { to, subject, html, from, type = 'general', userId = 'system' } = options;
  
  try {
    const result = await transporter.sendMail({
      from: from || `"StockIT" <${process.env.EMAIL_FROM || 'notifications@stockit.com'}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html
    });
    
    // Log successful email
    logEmailActivity(type, to, userId, true);
    
    return result;
  } catch (error) {
    // Log failed email attempt
    logEmailActivity(type, to, userId, false, error.message);
    console.error('Failed to send email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Route: Send Low Stock Alert Email
 */
router.post('/low-stock-alert', emailRateLimiter, authenticateToken, async (req, res) => {
  try {
    const { recipient, storeName, items, urgent = false } = req.body;
    
    // Validate required fields
    if (!recipient || !storeName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Validate recipient emails
    if (!validateRecipients(recipient)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient email address' 
      });
    }
    
    // Compile email template with provided data
    const html = await compileTemplate('low-stock-alert.html', {
      storeName,
      items,
      urgent
    });
      // Send email
    const result = await sendEmail({
      to: recipient,
      subject: urgent ? '🔴 URGENT: Low Stock Alert' : '⚠️ Low Stock Alert',
      html,
      type: 'low-stock-alert',
      userId: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Low stock alert email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Low stock alert error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send low stock alert email',
      details: error.message 
    });
  }
});

/**
 * Route: Send Password Reset Email
 */
router.post('/password-reset', emailRateLimiter, async (req, res) => {
  try {
    const { recipient, resetToken, username } = req.body;
    
    // Validate required fields
    if (!recipient || !resetToken || !username) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
      // Validate recipient email
    if (!validateRecipients(recipient)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient email address or too many recipients (maximum ' + MAX_RECIPIENTS + ' allowed)' 
      });
    }
    
    // Create reset URL
    const baseUrl = process.env.FRONTEND_URL || 'https://stockit.app';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    // Compile email template with provided data
    const html = await compileTemplate('password-reset.html', {
      username,
      resetUrl,
      resetToken
    });
      // Send email
    const result = await sendEmail({
      to: recipient,
      subject: 'Reset Your StockIT Password',
      html,
      type: 'password-reset',
      userId: 'anonymous' // Password reset can be requested by unauthenticated users
    });
    
    res.json({
      success: true,
      message: 'Password reset email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Password reset email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send password reset email',
      details: error.message 
    });
  }
});

/**
 * Route: Send Welcome Email
 */
router.post('/welcome', emailRateLimiter, async (req, res) => {
  try {
    const { recipient, name, organizationName } = req.body;
    
    // Validate required fields
    if (!recipient || !name || !organizationName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
      // Validate recipient email
    if (!validateRecipients(recipient)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient email address or too many recipients (maximum ' + MAX_RECIPIENTS + ' allowed)' 
      });
    }
    
    // Compile email template with provided data
    const html = await compileTemplate('welcome.html', {
      name,
      organizationName
    });
      // Send email
    const result = await sendEmail({
      to: recipient,
      subject: 'Welcome to StockIT!',
      html,
      type: 'welcome',
      userId: 'system' // Since this is called during registration, there might not be a user ID yet
    });
      res.json({
      success: true,
      message: 'Welcome email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Welcome email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send welcome email',
      details: error.message 
    });
  }
});

/**
 * Route: Send Inventory Report
 */
router.post('/inventory-report', emailRateLimiter, authenticateToken, async (req, res) => {
  try {
    const { recipient, reportType, storeName, categories, recommendations } = req.body;
    
    // Validate required fields
    if (!recipient || !reportType || !storeName || !categories) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
      // Validate recipient emails
    if (!validateRecipients(recipient)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient email address or too many recipients (maximum ' + MAX_RECIPIENTS + ' allowed)' 
      });
    }
    
    // Compile email template with provided data
    const html = await compileTemplate('inventory-report.html', {
      reportType,
      storeName,
      categories: Object.values(categories),
      recommendations,
      timestamp: new Date().toLocaleString()
    });
      // Send email
    const result = await sendEmail({
      to: recipient,
      subject: `${reportType} Inventory Report - ${storeName}`,
      html,
      type: 'inventory-report',
      userId: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Inventory report email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Inventory report email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send inventory report email',
      details: error.message 
    });
  }
});

/**
 * Route: Send Custom Email
 */
router.post('/custom', emailRateLimiter, authenticateToken, async (req, res) => {
  try {
    const { recipient, subject, body } = req.body;
    
    // Validate required fields
    if (!recipient || !subject || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
      // Validate recipient emails
    if (!validateRecipients(recipient)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient email address or too many recipients (maximum ' + MAX_RECIPIENTS + ' allowed)' 
      });
    }
    
    // Sanitize HTML content to prevent XSS
    const sanitizedBody = sanitizeHtml(body);
      // Send email
    const result = await sendEmail({
      to: recipient,
      subject,
      html: sanitizedBody,
      type: 'custom',
      userId: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Custom email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Custom email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send custom email',
      details: error.message 
    });
  }
});

/**
 * Route: Get Email Statistics
 */
router.get('/stats', emailRateLimiter, authenticateToken, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Administrator privileges required'
      });
    }
    
    const { period = 'day' } = req.query;
    
    // Validate period
    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: day, week, month'
      });
    }
    
    // Get email stats from the logger utility
    const { getEmailStats } = require('../utils/emailLogger');
    const stats = await getEmailStats(period);
    
    res.json({
      success: true,
      period,
      stats
    });
    
  } catch (error) {
    console.error('Email stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve email statistics',
      details: error.message
    });
  }
});

module.exports = router;
