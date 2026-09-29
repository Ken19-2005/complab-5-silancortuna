const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 8080;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3001';

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/orders', async (req, res) => {
  try {
    const result = await axios.post(`${ORDER_SERVICE_URL}/orders`, req.body, {
      timeout: 5000,
    });
    res.status(200).json({ message: result.data.message || 'Order created' });
  } catch (error) {
    console.error('Gateway order submission failed:', error.message);
    res.status(500).json({ error: 'Failed to create order at the order service.' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API Gateway running on port ${port}`);
});
