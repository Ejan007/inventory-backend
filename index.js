/**
 * StockIT Backend Server
 * Main entry point for the API
 */
const express = require('express');
const cors = require('cors');
const figlet = require('figlet');
const { PrismaClient } = require('@prisma/client');
const os = require('os');

// Import configuration
const { port: PORT, corsConfig, getCorsOptions } = require('./config');

// Import route modules
const authRoutes = require('./routes/auth');
const organizationRoutes = require('./routes/organizations');
const itemRoutes = require('./routes/items');
const storeRoutes = require('./routes/stores');
const historyRoutes = require('./routes/history');
const categoryRoutes = require('./routes/categories');
const utilityRoutes = require('./routes/utility');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(cors(getCorsOptions()));

// Mount routes
// Authentication routes
app.use('/', authRoutes); // For /login, /auth/login, etc.

// API routes
app.use('/api/organizations', organizationRoutes);
app.use('/api/organization', organizationRoutes); // Singular form for compatibility
app.use('/organization', organizationRoutes); // No /api prefix for compatibility
app.use('/items', itemRoutes);
app.use('/stores', storeRoutes);
app.use('/history', historyRoutes);

// Category routes with multiple paths for compatibility
app.use('/api/categories', categoryRoutes);
app.use('/categories', categoryRoutes);

// Utility routes
app.use('/api', utilityRoutes);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  figlet('StockIT', (err, data) => {
    if (err) {
      console.log('Something went wrong with figlet...');
      console.dir(err);
      return;
    }
    console.log(data);
    console.log(`Server is running on port ${PORT}`);
    
    // Print network access information
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    for (const iface of Object.values(networkInterfaces)) {
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          addresses.push(addr.address);
        }
      }
    }
    if (addresses.length > 0) {
      console.log(`\nAccess your API from other devices on your network:`);
      console.log(`http://${addresses[0]}:${PORT}`);
      console.log(`\nMake sure your frontend app points to this address.`);
    }
  });
});
