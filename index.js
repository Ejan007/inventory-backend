const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const figlet = require('figlet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000; // Changed from 4000 to 3000
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(express.json());

// Updated CORS configuration with allowed origins
const allowedOrigins = [
  'https://inventory-client-o8x7911id-ejan007s-projects.vercel.app',
  'https://inventory-client-gamma.vercel.app',
  'http://localhost:3000',
  'https://inventory-client-hndje53bd-ejan007s-projects.vercel.app',
  'http://192.168.1.104:3000',
  'http://192.168.1.104:4000',
  'capacitor://localhost',
  'ionic://localhost',
  '*'  // Add wildcard for testing only - remove in production
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // For testing, allow any origin
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, false);  // Don't throw error, just refuse
    }
  },
  credentials: true,             // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow all these methods
  optionsSuccessStatus: 200,     // For legacy browser support
};

app.use(cors(corsOptions));

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to filter by organization
const filterByOrganization = (req, res, next) => {
  if (!req.user.organizationId) {
    return next();
  }
  
  // For GET requests with query params
  if (req.method === 'GET') {
    req.query.organizationId = req.user.organizationId;
  }
  
  // For POST, PUT, DELETE with body
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    req.body.organizationId = req.user.organizationId;
  }
  
  next();
};

// Login Endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get organization name separately if needed
    let organizationName = null;
    if (user.organizationId) {
      try {
        const organization = await prisma.organization.findUnique({
          where: { id: user.organizationId }
        });
        organizationName = organization?.name;
      } catch (orgError) {
        console.log('Warning: Could not fetch organization:', orgError);
      }
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        organizationId: user.organizationId,
        organizationName: organizationName
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add another route for /auth/login that matches what the frontend expects
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get organization name separately if needed
    let organizationName = null;
    if (user.organizationId) {
      try {
        const organization = await prisma.organization.findUnique({
          where: { id: user.organizationId }
        });
        organizationName = organization?.name;
      } catch (orgError) {
        console.log('Warning: Could not fetch organization:', orgError);
      }
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        organizationId: user.organizationId,
        organizationName: organizationName,
        isNewOrganization: user.isNewOrganization
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Enhanced response with more user information
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: organizationName,
        isNewOrganization: user.isNewOrganization
      },
      success: true
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add registration endpoint with organization support
app.post('/auth/register', async (req, res) => {
  const { email, password, role = 'STORE', organizationName, isNewOrganization, existingOrganizationId } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let organizationId;
    
    if (isNewOrganization) {
      // Create new organization
      const newOrganization = await prisma.organization.create({
        data: {
          name: organizationName,
          adminEmail: email
        }
      });
      organizationId = newOrganization.id;
    } else if (existingOrganizationId) {
      // Verify existing organization
      const existingOrganization = await prisma.organization.findUnique({
        where: { id: parseInt(existingOrganizationId) }
      });
      
      if (!existingOrganization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      organizationId = existingOrganization.id;
    }

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role.toUpperCase(),
        organizationId,
        isNewOrganization: isNewOrganization || false
      },
    });

    // Generate JWT token for the new user
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        role: newUser.role, 
        organizationId,
        isNewOrganization: newUser.isNewOrganization
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Return success with token and user information
    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        organizationId,
        isNewOrganization: newUser.isNewOrganization
      },
      success: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Add missing endpoint for /api/auth/login to match frontend expectation
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get organization name separately if needed
    let organizationName = null;
    if (user.organizationId) {
      try {
        const organization = await prisma.organization.findUnique({
          where: { id: user.organizationId }
        });
        organizationName = organization?.name;
      } catch (orgError) {
        console.log('Warning: Could not fetch organization:', orgError);
      }
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        organizationId: user.organizationId,
        organizationName: organizationName,
        isNewOrganization: user.isNewOrganization
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Enhanced response with more user information
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: organizationName,
        isNewOrganization: user.isNewOrganization
      },
      success: true
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Organization endpoints
// Create organization
app.post('/api/organizations', authenticateToken, async (req, res) => {
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

// Get organization by ID
app.get('/api/organizations/:id', authenticateToken, async (req, res) => {
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

// Complete organization setup
app.post('/api/organizations/setup', authenticateToken, async (req, res) => {
  try {
    const { orgSettings, store, items } = req.body;
    const { organizationId } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'User is not associated with an organization' });
    }
    
    // Update organization settings
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        industry: orgSettings.industry,
        timezone: orgSettings.timezone,
        address: orgSettings.address,
        phone: orgSettings.phone
      }
    });
    
    // Create store
    const newStore = await prisma.store.create({
      data: {
        name: store.name,
        organizationId
      }
    });
    
    // Create items
    const itemCreates = items.map(item => 
      prisma.item.create({
        data: {
          name: item.name,
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
      })
    );
    
    await prisma.$transaction(itemCreates);
    
    // Mark user as completed onboarding
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { isNewOrganization: false }
    });
    
    res.status(201).json({ message: 'Organization setup completed successfully' });
  } catch (error) {
    console.error('Error completing organization setup:', error);
    res.status(500).json({ error: 'Failed to complete organization setup' });
  }
});

// Also add the singular version of the endpoint to match frontend expectation
app.post('/api/organization/setup', authenticateToken, async (req, res) => {
  try {    console.log('Received organization setup request:', req.body);
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
    });    console.log('Organization updated:', updatedOrg);
    
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
});

// Get all organizations (admin only)
app.get('/api/organizations', authenticateToken, async (req, res) => {
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

// Create an inventory item
app.post('/items', authenticateToken, filterByOrganization, async (req, res) => {
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

// Get a single inventory item
app.get('/items/:id', authenticateToken, filterByOrganization, async (req, res) => {
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

// Get all inventory items
app.get('/items', authenticateToken, filterByOrganization, async (req, res) => {
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

// Get items by store
app.get('/items/store/:storeId', authenticateToken, filterByOrganization, async (req, res) => {
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

// Update an inventory item and log history
app.put('/items/:id', authenticateToken, filterByOrganization, async (req, res) => {
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

// Get full history
app.get('/history-full', authenticateToken, filterByOrganization, async (req, res) => {
  try {
    const history = await prisma.itemHistory.findMany({
      include: { item: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(history);
  } catch (error) {
    console.error('Error fetching full history:', error);
    res.status(500).json({ error: 'Failed to fetch full history' });
  }
});

// Delete an inventory item
app.delete('/items/:id', authenticateToken, filterByOrganization, async (req, res) => {
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

// Get stores
app.get('/stores', authenticateToken, filterByOrganization, async (req, res) => {
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

// Create a store
app.post('/stores', authenticateToken, filterByOrganization, async (req, res) => {
  try {
    const { name, organizationId } = req.body;
    
    const store = await prisma.store.create({
      data: {
        name,
        organizationId: parseInt(organizationId)
      }
    });
    
    res.status(201).json(store);
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// Category Management Endpoints
// Get all categories for an organization
app.get('/api/categories', authenticateToken, async (req, res) => {
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

// Add a new category
app.post('/api/categories', authenticateToken, async (req, res) => {
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

// Delete a category
app.delete('/api/categories/:categoryName', authenticateToken, async (req, res) => {
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

// Add a test endpoint to check connectivity
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is running and accessible!',
    timestamp: new Date().toISOString(),
    clientIp: req.ip || req.connection.remoteAddress,
    headers: req.headers
  });
});

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
    const networkInterfaces = require('os').networkInterfaces();
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
