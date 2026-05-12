import pika
import requests
import json
import socket

#เชื่อมต่อ RabbitMQ server
connection = pika.BlockingConnection(
    pika.ConnectionParameters('localhost')
)

#สร้างช่อง ติดต่อ
channel = connection.channel()

#สร้าง queue
channel.queue_declare(queue='adsb_queue')

#get ADS-B data
response = requests.get('http://localhost:8080/data/aircraft.json')

data = response.json()

#convert to json
message = json.dumps(data)

#ส่งข้อความ message ผ่าน queue
channel.basic_publish(
    exchange='',
    routing_key='adsb_queue',
    body=message,
    properties=pika.BasicProperties(
        delivery_mode=2
    )
)

print("Message sent")

#ปิดการเชื่อมต่อ
connection.close()