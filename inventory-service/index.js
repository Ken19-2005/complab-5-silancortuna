const amqp = require('amqplib');

const brokerUrl = process.env.BROKER_URL || 'amqp://guest:guest@localhost:5672';

async function start() {
  const connection = await amqp.connect(brokerUrl);
  const channel = await connection.createChannel();

  await channel.assertExchange('shop.events', 'topic', { durable: true });
  const queue = 'inventory_queue';
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, 'shop.events', 'order.placed');

  channel.consume(queue, (message) => {
    if (!message) return;

    const order = JSON.parse(message.content.toString());
    console.log('Inventory service received order:', order);

    const inventoryMessage = {
      orderId: order.id,
      product: order.product,
      quantity: order.quantity,
      status: 'reserved',
    };

    channel.publish('shop.events', 'inventory.reserved', Buffer.from(JSON.stringify(inventoryMessage)), { persistent: true });
    console.log('Published inventory.reserved event');
    channel.ack(message);
  }, { noAck: false });

  console.log('Inventory service listening on inventory_queue');
}

async function boot() {
  while (true) {
    try {
      await start();
      return;
    } catch (error) {
      console.error('Inventory service connection failed; retrying in 5s:', error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

boot();
