/**
 * Category Routes
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware');

const prisma = new PrismaClient();

/**
 * Get all categories for an organization
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'User is not associated with an organization' });
    }
    
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({ categories: organization.defaultCategories || [] });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * Add a new category
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category } = req.body;
    const { organizationId } = req.user;
    
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({ error: 'Valid category name is required' });
    }
    
    if (!organizationId) {
      return res.status(400).json({ error: 'User is not associated with an organization' });
    }
    
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Check if category already exists
    if (organization.defaultCategories && organization.defaultCategories.includes(category)) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    
    // Add new category
    const updatedCategories = [...(organization.defaultCategories || []), category];
    
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: { defaultCategories: updatedCategories }
    });
    
    res.status(201).json({
      message: 'Category added successfully',
      categories: updatedOrg.defaultCategories
    });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

/**
 * Delete a category
 */
router.delete('/:categoryName', authenticateToken, async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { organizationId } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'User is not associated with an organization' });
    }
    
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Check if category exists
    if (!organization.defaultCategories || !organization.defaultCategories.includes(categoryName)) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Remove category
    const updatedCategories = organization.defaultCategories.filter(cat => cat !== categoryName);
    
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: { defaultCategories: updatedCategories }
    });
    
    res.json({
      message: 'Category deleted successfully',
      categories: updatedOrg.defaultCategories
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
