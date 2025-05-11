/**
 * Email Service Logger
 * 
 * This utility provides logging functionality for the email service,
 * including log rotation and structured logging.
 */
const fs = require('fs');
const path = require('path');

// Base directory for logs
const LOG_DIR = path.join(__dirname, '../logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file paths
const EMAIL_LOG_FILE = path.join(LOG_DIR, 'email-service.log');
const EMAIL_ERROR_LOG_FILE = path.join(LOG_DIR, 'email-service-error.log');

/**
 * Create a timestamp for logging
 * @returns {string} - Formatted timestamp
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Rotate logs if they exceed the size limit
 * @param {string} logFile - Path to log file
 * @param {number} [maxSize=5242880] - Maximum file size in bytes (default: 5MB)
 * @param {number} [maxFiles=5] - Maximum number of rotated files to keep
 */
const rotateLogIfNeeded = (logFile, maxSize = 5 * 1024 * 1024, maxFiles = 5) => {
  try {
    // Check if the file exists
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      
      // If file exceeds max size, rotate it
      if (stats.size > maxSize) {
        // Check and delete oldest rotated file if we hit max files
        const oldestRotatedFile = `${logFile}.${maxFiles}`;
        if (fs.existsSync(oldestRotatedFile)) {
          fs.unlinkSync(oldestRotatedFile);
        }
        
        // Shift each existing rotated file
        for (let i = maxFiles - 1; i >= 1; i--) {
          const oldFile = `${logFile}.${i}`;
          const newFile = `${logFile}.${i + 1}`;
          
          if (fs.existsSync(oldFile)) {
            fs.renameSync(oldFile, newFile);
          }
        }
        
        // Rename current log file to .1
        fs.renameSync(logFile, `${logFile}.1`);
        
        // Create a new empty log file
        fs.writeFileSync(logFile, '');
      }
    }
  } catch (error) {
    console.error(`Error rotating log file: ${error.message}`);
  }
};

/**
 * Log email activity
 * @param {string} type - Email type
 * @param {string|string[]} recipients - Email recipients
 * @param {string} userId - User ID
 * @param {boolean} success - Whether the email was sent successfully
 * @param {string} [errorMessage] - Error message if unsuccessful
 */
const logEmailActivity = (type, recipients, userId, success, errorMessage = null) => {
  try {
    // Rotate logs if needed
    rotateLogIfNeeded(EMAIL_LOG_FILE);
    if (!success) {
      rotateLogIfNeeded(EMAIL_ERROR_LOG_FILE);
    }
    
    const timestamp = getTimestamp();
    const recipientCount = Array.isArray(recipients) ? recipients.length : 1;
    const recipientList = Array.isArray(recipients) ? recipients.join(', ') : recipients;
    
    // Format the log entry
    const logEntry = {
      timestamp,
      type,
      success,
      recipientCount,
      recipients: recipientList,
      userId: userId || 'anonymous',
      ...(errorMessage && { error: errorMessage })
    };
    
    // Write to the main log file
    fs.appendFileSync(
      EMAIL_LOG_FILE,
      `${JSON.stringify(logEntry)}\n`
    );
    
    // Also write failures to the error log
    if (!success) {
      fs.appendFileSync(
        EMAIL_ERROR_LOG_FILE,
        `${JSON.stringify(logEntry)}\n`
      );
    }
    
    // Also log to console
    console.log(`[EMAIL ${success ? 'SUCCESS' : 'ERROR'}] ${timestamp} | Type: ${type} | User: ${userId || 'anonymous'} | Recipients: ${recipientCount} | ${errorMessage || ''}`);
    
  } catch (error) {
    console.error(`Error logging email activity: ${error.message}`);
  }
};

/**
 * Get email activity statistics
 * @param {string} [period='day'] - Time period (day, week, month)
 * @returns {Promise<Object>} - Email statistics
 */
const getEmailStats = async (period = 'day') => {
  try {
    if (!fs.existsSync(EMAIL_LOG_FILE)) {
      return {
        total: 0,
        success: 0,
        failure: 0,
        byType: {}
      };
    }
    
    const logs = await fs.promises.readFile(EMAIL_LOG_FILE, 'utf8');
    const logLines = logs.trim().split('\n');
    
    // Filter by period
    const now = new Date();
    let cutoffDate;
    
    switch (period) {
      case 'week':
        cutoffDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default: // day
        cutoffDate = new Date(now.setDate(now.getDate() - 1));
        break;
    }
    
    // Parse and count
    let total = 0;
    let success = 0;
    let failure = 0;
    const byType = {};
    
    for (const line of logLines) {
      try {
        const entry = JSON.parse(line);
        const logDate = new Date(entry.timestamp);
        
        // Skip entries outside of the period
        if (logDate < cutoffDate) {
          continue;
        }
        
        total++;
        
        if (entry.success) {
          success++;
        } else {
          failure++;
        }
        
        // Count by type
        byType[entry.type] = byType[entry.type] || { total: 0, success: 0, failure: 0 };
        byType[entry.type].total++;
        
        if (entry.success) {
          byType[entry.type].success++;
        } else {
          byType[entry.type].failure++;
        }
        
      } catch (error) {
        // Skip malformed log entries
        continue;
      }
    }
    
    return {
      total,
      success,
      failure,
      byType
    };
    
  } catch (error) {
    console.error(`Error getting email stats: ${error.message}`);
    return {
      total: 0,
      success: 0,
      failure: 0,
      byType: {}
    };
  }
};

module.exports = {
  logEmailActivity,
  getEmailStats
};
