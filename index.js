const express = require('express');
const cors =  require('cors');
const { PrismaClient } = require('@prisma/client');
const figlet = require('figlet');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Create an inventory item
// Create an inventory item
app.post('/items', async (req, res) => {
  // Extract storeId along with other fields from the request body
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
        storeId  // Now including storeId in the data
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

// Update an inventory item
app.put('/items/:id', async (req, res) => {
  const { id } = req.params;
  const { name, quantity } = req.body;
  try {
    const item = await prisma.item.update({
      where: { id: Number(id) },
      data: { name, quantity },
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
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