/**
 * Item Routes
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, filterByOrganization } = require('../middleware');

const prisma = new PrismaClient();

/**
 * Create an inventory item
 */
router.post('/', authenticateToken, filterByOrganization, async (req, res) => {
  const { name, category, quantity, mondayRequired, tuesdayRequired, wednesdayRequired, thursdayRequired, fridayRequired, saturdayRequired, sundayRequired, storeId } = req.body;
  try {
    // Validate required fields
    if (!name || !storeId) {
      return res.status(400).json({ error: 'Name and storeId are required fields' });
    }
    
    const item = await prisma.item.create({
      data: { 
        name, 
        category: category || 'Other', // Use the provided category or default to 'Other'
        quantity, 
        mondayRequired, 
        tuesdayRequired,
        wednesdayRequired,
        thursdayRequired,
        fridayRequired,
        saturdayRequired,
        sundayRequired,
        storeId,
        organizationId: req.user.organizationId
      },
    });
    res.json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to add item', details: error.message });
  }
});

/**
 * Get a single inventory item
 */
router.get('/:id', authenticateToken, filterByOrganization, async (req, res) => {
  const { id } = req.params;
  try {
    const item = await prisma.item.findUnique({
      where: { id: Number(id) },
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve item' });
  }
});

/**
 * Get all inventory items
 */
router.get('/', authenticateToken, filterByOrganization, async (req, res) => {
  try {
    const { organizationId } = req.query;
    const filter = organizationId ? { where: { organizationId: parseInt(organizationId) } } : {};
    
    const items = await prisma.item.findMany(filter);
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to retrieve items' });
  }
});

/**
 * Get items by store
 */
router.get('/store/:storeId', authenticateToken, filterByOrganization, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { organizationId } = req.query;
    
    const items = await prisma.item.findMany({
      where: { 
        storeId: parseInt(storeId),
        ...(organizationId ? { organizationId: parseInt(organizationId) } : {})
      }
    });
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching items by store:', error);
    res.status(500).json({ error: 'Failed to retrieve items by store' });
  }
});

/**
 * Update an inventory item and log history
 */
router.put('/:id', authenticateToken, filterByOrganization, async (req, res) => {
  const { id } = req.params;
  const { 
    name,
    category,
    quantity, 
    mondayRequired, 
    tuesdayRequired, 
    wednesdayRequired, 
    thursdayRequired, 
    fridayRequired, 
    saturdayRequired, 
    sundayRequired,
    updatedBy 
  } = req.body;

  try {
    const updatedItem = await prisma.item.update({
      where: { id: Number(id) },
      data: { 
        name,
        category,
        quantity,
        mondayRequired,
        tuesdayRequired,
        wednesdayRequired,
        thursdayRequired,
        fridayRequired,
        saturdayRequired,
        sundayRequired
      },
    });

    await prisma.itemHistory.create({
      data: {
        itemId: Number(id),
        quantity: Number(quantity),
        updatedBy: updatedBy || 'Unknown',
      },
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item and logging history:', error);
    res.status(500).json({ error: 'Failed to update item and log history' });
  }
});

/**
 * Delete an inventory item
 */
router.delete('/:id', authenticateToken, filterByOrganization, async (req, res) => {
  const { id } = req.params;
  try {
    const item = await prisma.item.delete({
      where: { id: Number(id) },
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
