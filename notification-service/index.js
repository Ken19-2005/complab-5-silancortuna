const amqp = require('amqplib');

const brokerUrl = process.env.BROKER_URL || 'amqp://guest:guest@localhost:5672';

async function start() {
  const connection = await amqp.connect(brokerUrl);
  const channel = await connection.createChannel();

  await channel.assertExchange('shop.events', 'topic', { durable: true });
  const queue = 'notification_payment_queue';
  await channel.assertQueue(queue, { durable: true, arguments: { 'x-message-ttl': 60000 } });
  await channel.unbindQueue(queue, 'shop.events', 'order.placed');
  await channel.bindQueue(queue, 'shop.events', 'payment.success');

  channel.consume(queue, (message) => {
    if (!message) return;

    const payload = JSON.parse(message.content.toString());
    console.log('Notification service received payload:', payload);
    channel.ack(message);
  }, { noAck: false });

  console.log('Notification service listening on notification_payment_queue');
}

async function boot() {
  while (true) {
    try {
      await start();
      return;
    } catch (error) {
      console.error('Notification service connection failed; retrying in 5s:', error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

boot();