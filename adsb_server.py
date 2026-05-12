from flask import Flask, jsonify
import json

app = Flask(__name__)

@app.route('/data/aircraft.json')
def aircraft():

    with open('data/aircraft.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    return jsonify(data)

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=8080,
        debug=True
    )