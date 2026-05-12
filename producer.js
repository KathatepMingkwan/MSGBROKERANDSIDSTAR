const amqp = require("amqplib")

async function sendMessage() {
    const connection = await amqp.connect("amqp://localhost:5672");
    const channel
}