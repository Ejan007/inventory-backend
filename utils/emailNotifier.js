/**
 * Email Notifier Utility
 * 
 * This module provides a simpler interface for sending emails triggered by system events
 * without needing to manually call the email routes.
 */
const axios = require('axios');
const config = require('../config');

// Base URL for API requests (using the same service)
const baseUrl = `http://127.0.0.1:${process.env.PORT || 4000}/api/email`;

/**
 * Get authentication token for internal API requests
 * @returns {Promise<string>} - JWT token for system requests
 */
const getSystemAuthToken = async () => {
  try {
    // This assumes you have a system user with appropriate permissions
    const authResponse = await axios.post(`http://127.0.0.1:${process.env.PORT || 4000}/api/auth/login`, {
      email: process.env.SYSTEM_EMAIL || 'system@stockit.internal',
      password: process.env.SYSTEM_PASSWORD || 'systempassword'
    });
    
    return authResponse.data.token;
  } catch (error) {
    console.error('Failed to get system auth token:', error.message);
    return null;
  }
};

/**
 * Send a low stock alert email
 * @param {Object} data - Alert data
 * @returns {Promise<Object>} - API response
 */
const sendLowStockAlert = async (data) => {
  try {
    const token = await getSystemAuthToken();
    if (!token) {
      throw new Error('Failed to authenticate system user');
    }
    
    const response = await axios.post(`${baseUrl}/low-stock-alert`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to send low stock alert:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send a welcome email to new user
 * @param {Object} data - User data
 * @returns {Promise<Object>} - API response
 */
const sendWelcomeEmail = async (data) => {
  try {
    // Welcome endpoint no longer requires authentication
    const response = await axios.post(`${baseUrl}/welcome`, data);
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send a password reset email
 * @param {Object} data - Password reset data
 * @returns {Promise<Object>} - API response
 */
const sendPasswordResetEmail = async (data) => {
  try {
    const response = await axios.post(`${baseUrl}/password-reset`, data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send an inventory report email
 * @param {Object} data - Report data
 * @returns {Promise<Object>} - API response
 */
const sendInventoryReportEmail = async (data) => {
  try {
    const token = await getSystemAuthToken();
    if (!token) {
      throw new Error('Failed to authenticate system user');
    }
    
    const response = await axios.post(`${baseUrl}/inventory-report`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to send inventory report email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendLowStockAlert,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInventoryReportEmail
};
