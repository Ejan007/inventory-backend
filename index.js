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

// Replace the CORS configuration with:
const corsOptions = {
  origin: 'https://inventory-client-o8x7911id-ejan007s-projects.vercel.app', // Your client's URL
  optionsSuccessStatus: 200
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
    res.status(500).json({ error: 'Failed to add item' });
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
  const { quantity, updatedBy } = req.body;

  try {
    const updatedItem = await prisma.item.update({
      where: { id: Number(id) },
      data: { quantity },
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
