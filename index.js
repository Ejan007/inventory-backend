const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const figlet = require('figlet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(express.json());

// Updated CORS configuration with allowed origins
const allowedOrigins = [
  'https://inventory-client-o8x7911id-ejan007s-projects.vercel.app',
  'https://inventory-client-gamma.vercel.app',
  'http://localhost:3000',
  'https://master.d2vsxhqb9wv804.amplifyapp.com',
  'https://inventory-client-hndje53bd-ejan007s-projects.vercel.app'

];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
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

    const token = jwt.sign(
      { userId: user.id, role: user.role },
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
      where: { email },
      include: { organization: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name,
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
        organizationName: user.organization?.name,
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
      where: { email },
      include: { organization: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name,
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
        organizationName: user.organization?.name,
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
  try {
    console.log('Received organization setup request:', req.body);
    console.log('User context:', req.user);
    
    const { orgSettings, store, items } = req.body;
    const { userId, organizationId } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'User is not associated with an organization' });
    }
    
    console.log(`Setting up organization ID: ${organizationId}`);
    
    // Convert industry value to uppercase to match the enum values
    const industryValue = orgSettings.industry ? orgSettings.industry.toUpperCase() : 'OTHER';
    console.log(`Converting industry value from "${orgSettings.industry}" to "${industryValue}"`);
    
    // Update organization settings
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        industry: industryValue,
        timezone: orgSettings.timezone || 'Australia/Canberra',
        address: orgSettings.address || '',
        phone: orgSettings.phone || ''
      }
    });
    console.log('Organization updated:', updatedOrg);
    
    // Create store
    const newStore = await prisma.store.create({
      data: {
        name: store.name || 'Main Store',
        organizationId
      }
    });
    console.log('Store created:', newStore);
    
    // Create items
    if (Array.isArray(items) && items.length > 0) {
      console.log(`Creating ${items.length} items for store ${newStore.id}`);
      
      for (const item of items) {
        await prisma.item.create({
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
    
    res.status(201).json({ 
      message: 'Organization setup completed successfully',
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
  const { name, quantity, mondayRequired, tuesdayRequired, wednesdayRequired, thursdayRequired, fridayRequired, saturdayRequired, sundayRequired, storeId } = req.body;
  try {
    const item = await prisma.item.create({
      data: { 
        name, 
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

app.listen(PORT, () => {
  figlet('StockIT', (err, data) => {
    if (err) {
      console.log('Something went wrong with figlet...');
      console.dir(err);
      return;
    }
    console.log(data);
    console.log(`Server is running on port ${PORT}`);
  });
});
