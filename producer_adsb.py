import pika
import requests
import json
import socket
import websockets
import asyncio

#เชื่อมต่อ RabbitMQ server
connection = pika.BlockingConnection(
    pika.ConnectionParameters('localhost')
)

#สร้างช่อง ติดต่อ
channel = connection.channel()

#สร้าง queue
channel.queue_declare(queue='adsb_queue')

async def consume_ws():

    async with websockets.connect("ws://localhost:8765") as websocket:

        while True:

            try:
                message = await websocket.recv()

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

            except Exception as e:
                print("error", e)
                break

asyncio.run(consume_ws())