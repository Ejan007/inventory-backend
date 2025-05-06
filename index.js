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
    
    // Enhanced response with more user information
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      success: true
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add registration endpoint
app.post('/auth/register', async (req, res) => {
  const { email, password, role = 'STORE' } = req.body;
  
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

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role.toUpperCase(),
      },
    });

    // Generate JWT token for the new user
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
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
        role: newUser.role
      },
      success: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Create an inventory item
app.post('/items', async (req, res) => {
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
        storeId
      },
    });
    res.json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to add item', details: error.message });
  }
});


// Get a single inventory item
app.get('/items/:id', async (req, res) => {
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
app.get('/items', async (req, res) => {
  try {
    const items = await prisma.item.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve items' });
  }
});

// Update an inventory item and log history
app.put('/items/:id', async (req, res) => {
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
app.get('/history-full', async (req, res) => {
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
app.delete('/items/:id', async (req, res) => {
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
