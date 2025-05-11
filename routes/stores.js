/**
 * Store Routes
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, filterByOrganization } = require('../middleware');

const prisma = new PrismaClient();

/**
 * Get all stores
 */
router.get('/', authenticateToken, filterByOrganization, async (req, res) => {
  try {
    const { organizationId } = req.query;
    const filter = organizationId ? { where: { organizationId: parseInt(organizationId) } } : {};
    
    const stores = await prisma.store.findMany(filter);
    res.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to retrieve stores' });
  }
});

/**
 * Create a store
 */
router.post('/', authenticateToken, filterByOrganization, async (req, res) => {
  try {
    const { name, organizationId, address } = req.body;
    
    const store = await prisma.store.create({
      data: {
        name,
        address,
        organizationId: parseInt(organizationId)
      }
    });
    
    res.status(201).json(store);
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

module.exports = router;
