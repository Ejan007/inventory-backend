/**
 * Organization Routes
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware');

const prisma = new PrismaClient();

/**
 * Create organization
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, industry, address, phone, timezone } = req.body;
    
    const organization = await prisma.organization.create({
      data: {
        name,
        industry: industry || 'OTHER',
        address,
        phone,
        timezone: timezone || 'Australia/Canberra',
        adminEmail: req.user.email
      }
    });
    
    res.status(201).json(organization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

/**
 * Get organization by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await prisma.organization.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Check if user belongs to this organization
    if (req.user.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

/**
 * Organization setup handler (shared between endpoints)
 */
const setupHandler = async (req, res) => {
  try {
    console.log('Received organization setup request:', req.body);
    console.log('User context:', req.user);
    
    const { orgSettings = {}, store = {}, items = [], defaultCategories } = req.body;
    const { userId, organizationId } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'User is not associated with an organization' });
    }
    
    console.log(`Setting up organization ID: ${organizationId}`);
    
    // Convert industry value to uppercase to match the enum values
    const industryValue = orgSettings && orgSettings.industry ? orgSettings.industry.toUpperCase() : 'OTHER';
    console.log(`Using industry value: "${industryValue}"`);
    
    // Prepare update data with support for new fields
    const orgUpdateData = {
      industry: industryValue,
      timezone: orgSettings.timezone || 'Australia/Canberra',
      address: orgSettings.address || '',
      phone: orgSettings.phone || ''
    };
    
    // Add optional fields only if they exist
    if (orgSettings.contactEmail !== undefined) orgUpdateData.contactEmail = orgSettings.contactEmail;
    if (orgSettings.contactPhone !== undefined) orgUpdateData.contactPhone = orgSettings.contactPhone;
    if (orgSettings.logoUrl !== undefined) orgUpdateData.logoUrl = orgSettings.logoUrl;
    if (defaultCategories !== undefined) orgUpdateData.defaultCategories = defaultCategories;
    
    // Update organization settings
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: orgUpdateData
    });
    console.log('Organization updated:', updatedOrg);
    
    // Create store with proper null handling
    const newStore = await prisma.store.create({
      data: {
        name: store && store.name ? store.name : 'Main Store',
        address: store && store.address ? store.address : null,
        organizationId
      }
    });
    console.log('Store created:', newStore);
    
    // Create items with category support
    if (Array.isArray(items) && items.length > 0) {
      console.log(`Creating ${items.length} items for store ${newStore.id}`);
      
      for (const item of items) {
        await prisma.item.create({
          data: {
            name: item.name,
            category: item.category || 'Other',
            quantity: item.quantity || 0,
            mondayRequired: item.mondayRequired || 0,
            tuesdayRequired: item.tuesdayRequired || 0,
            wednesdayRequired: item.wednesdayRequired || 0,
            thursdayRequired: item.thursdayRequired || 0,
            fridayRequired: item.fridayRequired || 0,
            saturdayRequired: item.saturdayRequired || 0,
            sundayRequired: item.sundayRequired || 0,
            storeId: newStore.id,
            organizationId
          }
        });
      }
      console.log('All items created successfully');
    } else {
      console.log('No items to create');
    }
    
    // Mark user as completed onboarding
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isNewOrganization: false }
    });
    console.log('User updated:', updatedUser);
    
    // Send response in the format expected by frontend
    res.status(201).json({ 
      message: 'Organization setup completed successfully',
      organization: updatedOrg,
      stores: [newStore],
      organizationId,
      storeId: newStore.id
    });
  } catch (error) {
    console.error('Error completing organization setup:', error);
    // Send more detailed error information
    res.status(500).json({ 
      error: 'Failed to complete organization setup', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Complete organization setup - multiple paths for compatibility
 */
router.post('/setup', authenticateToken, setupHandler);
router.post('/organization/setup', authenticateToken, setupHandler);
router.post('/organizations/setup', authenticateToken, setupHandler);

/**
 * Get all organizations (admin only)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required' });
    }
    
    const organizations = await prisma.organization.findMany();
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

module.exports = router;
