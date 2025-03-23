from flask import Flask, request, jsonify
from pymongo import MongoClient
from functools import wraps
import jwt

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

client = MongoClient('mongodb://localhost:27017/')
db = client.bus_reservations

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            jwt.decode(token.split()[1], app.config['SECRET_KEY'], algorithms=["HS256"])
        except:
            return jsonify({'message': 'Invalid token!'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/schedules', methods=['GET'])
@token_required
def get_schedules():
    date = request.args.get('date')
    route = request.args.get('route')
    
    schedules = db.schedules.find({
        'date': date,
        'route': route
    })
    
    result = []
    for schedule in schedules:
        total_seats = 40
        occupied = sum(len(seats) for seats in schedule['seats'].values())
        result.append({
            'id': str(schedule['_id']),
            'date': schedule['date'],
            'route': schedule['route'],
            'departure_time': schedule['departure_time'],
            'available_seats': total_seats - occupied
        })
    
    return jsonify({'schedules': result}), 200

@app.route('/seats/<schedule_id>', methods=['GET'])
@token_required
def get_seats(schedule_id):
    schedule = db.schedules.find_one({'_id': ObjectId(schedule_id)})
    if not schedule:
        return jsonify({'message': 'Schedule not found'}), 404
    
    return jsonify({'seats': schedule['seats']}), 200

@app.route('/reserve', methods=['POST'])
@token_required
def reserve_seat():
    data = request.get_json()
    
    # Verificar disponibilidad y reservar
    result = db.schedules.update_one(
        {'_id': ObjectId(data['schedule_id'])},
        {'$push': {f'seats.{data["seat"][0]}': int(data["seat"][1:])}}
    )
    
    if result.modified_count == 0:
        return jsonify({'message': 'Seat already taken'}), 400
    
    # Registrar la reserva
    db.reservations.insert_one({
        'user_id': get_user_id_from_token(request),
        'schedule_id': data['schedule_id'],
        'seat': data['seat'],
        'reserved_at': datetime.datetime.utcnow()
    })
    
    return jsonify({'message': 'Reservation successful'}), 201

if __name__ == '__main__':
    app.run(port=5001)
