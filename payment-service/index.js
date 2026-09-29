const amqp = require('amqplib');

const brokerUrl = process.env.BROKER_URL || 'amqp://guest:guest@localhost:5672';

async function start() {
  const connection = await amqp.connect(brokerUrl);
  const channel = await connection.createChannel();

  await channel.assertExchange('shop.events', 'topic', { durable: true });
  const queue = 'payment_queue';
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, 'shop.events', 'order.placed');

  channel.consume(queue, (message) => {
    if (!message) return;

    const order = JSON.parse(message.content.toString());
    console.log('Payment service received order:', order);

    const result = {
      orderId: order.id,
      status: 'paid',
      customerName: order.customerName,
      product: order.product,
      quantity: order.quantity,
    };

    channel.publish('shop.events', 'payment.success', Buffer.from(JSON.stringify(result)), { persistent: true });
    console.log('Published payment.success event');
    channel.ack(message);
  }, { noAck: false });

  console.log('Payment service listening on payment_queue');
}

async function boot() {
  while (true) {
    try {
      await start();
      return;
    } catch (error) {
      console.error('Payment service connection failed; retrying in 5s:', error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

boot();
