import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Storage directory
const STORAGE_DIR = path.join(__dirname, 'data');

// Ensure storage directory exists
await fs.mkdir(STORAGE_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Get item
app.get('/api/storage/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const filePath = path.join(STORAGE_DIR, `${key}.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      res.json({ value: parsed.value });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: 'Not found' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set item
app.post('/api/storage/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    const filePath = path.join(STORAGE_DIR, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify({ value }, null, 2), 'utf-8');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all keys
app.get('/api/storage', async (req, res) => {
  try {
    const files = await fs.readdir(STORAGE_DIR);
    const keys = files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    res.json({ keys });
  } catch (error) {
    console.error('Error listing keys:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Storage server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${STORAGE_DIR}`);
});
