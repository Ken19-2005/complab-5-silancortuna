const express = require('express');
const amqp = require('amqplib');

const app = express();
const port = 3001;
const brokerUrl = process.env.BROKER_URL || 'amqp://guest:guest@localhost:5672';

app.use(express.json());

async function publishOrder(order) {
  const connection = await amqp.connect(brokerUrl);
  const channel = await connection.createChannel();

  await channel.assertExchange('shop.events', 'topic', { durable: true });

  const message = Buffer.from(JSON.stringify(order));
  channel.publish('shop.events', 'order.placed', message, { persistent: true });

  console.log(`Published event to order.placed for ${order.customerName}`);

  setTimeout(() => connection.close(), 500);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/orders', async (req, res) => {
  const { customerName, product, quantity } = req.body;

  if (!customerName || !product || !quantity) {
    return res.status(400).json({ error: 'customerName, product, and quantity are required.' });
  }

  const order = {
    id: `order-${Date.now()}`,
    customerName,
    product,
    quantity,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    await publishOrder(order);
    res.status(201).json({ message: `Order ${order.id} accepted` });
  } catch (error) {
    console.error('Order submission error:', error.message);
    res.status(500).json({ error: 'Order service failed to process request.' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Order service running on port ${port}`);
});
