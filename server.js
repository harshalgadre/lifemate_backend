const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection URL and Database Name
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'myproject';

// Middleware
app.use(express.json());

// Global variable for database connection
let db;

// Connect to MongoDB
MongoClient.connect(url, { useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  })
  .catch(error => console.error('MongoDB connection error:', error));

// Routes
app.get('/', (req, res) => {
  res.send('Hello World! This is a basic backend server with MongoDB.');
});

app.get('/health', (req, res) => {
  const mongoStatus = db ? 'Connected' : 'Disconnected';
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    mongodb: mongoStatus
  });
});

// Basic CRUD operations for a sample collection
// CREATE - Add a new item
app.post('/items', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const collection = db.collection('items');
    const item = req.body;
    item.createdAt = new Date();
    
    const result = await collection.insertOne(item);
    res.status(201).json({ id: result.insertedId, ...item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item', details: error.message });
  }
});

// READ - Get all items
app.get('/items', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const collection = db.collection('items');
    const items = await collection.find({}).toArray();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items', details: error.message });
  }
});

// READ - Get item by ID
app.get('/items/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const collection = db.collection('items');
    const item = await collection.findOne({ _id: req.params.id });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item', details: error.message });
  }
});

// UPDATE - Update an item by ID
app.put('/items/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const collection = db.collection('items');
    const item = req.body;
    item.updatedAt = new Date();
    
    const result = await collection.updateOne(
      { _id: req.params.id },
      { $set: item }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.status(200).json({ message: 'Item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item', details: error.message });
  }
});

// DELETE - Delete an item by ID
app.delete('/items/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const collection = db.collection('items');
    const result = await collection.deleteOne({ _id: req.params.id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});