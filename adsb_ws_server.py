import json
import websockets
import asyncio

def load_data():
    with open('data/aircraft.json', 'r', encoding='utf-8') as f:
        return json.load(f)

async def handler(websocket):

    while True:

        data = load_data()

        await websocket.send(
            json.dumps(data)
        )

        await asyncio.sleep(1)

async def main():

    server = await websockets.serve(
        handler,
        "0.0.0.0",
        8765
    )

    print("WebSocket ADS-B Server started")

    await server.wait_closed()

asyncio.run(main())