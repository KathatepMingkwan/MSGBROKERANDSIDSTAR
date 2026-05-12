import pika

#เชื่อมต่อ RabbitMQ server
connection = pika.BlockingConnection(
    pika.ConnectionParameters('localhost')
)

#สร้างช่อง ติดต่อ
channel = connection.channel()

#สร้าง queue
channel.queue_declare(queue='hello_queue')

#ส่งข้อความ Hello from Python! ผ่าน queue
channel.basic_publish(
    exchange='',
    routing_key='hello_queue',
    body='Hello from Python!'
)

print("Message sent")

#ปิดการเชื่อมต่อ
connection.close()