import pika

#เชื่อมต่อ RabbitMQ server
connection = pika.BlockingConnection(
    pika.ConnectionParameters('localhost')
)

#สร้างช่อง ติดต่อ
channel = connection.channel()

#สร้าง queue
channel.queue_declare(queue='hello_queue')


def callback(ch, method, properties, body):
    print("Received:", body.decode())

channel.basic_consume(
        queue='hello_queue',
        on_message_callback=callback,
        auto_ack=True
)

print("Waiting for messages...")
channel.start_consuming()