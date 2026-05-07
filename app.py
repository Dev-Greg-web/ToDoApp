from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Konfiguracja sesji i CORS
# Secret Key to klucz, którym Flask szyfruje ciasteczka. Nigdy go nie udostępniaj!
app.secret_key = os.getenv('SECRET_KEY') 

# Musimy wskazać dokładny adres Reacta i pozwolić na ciasteczka (supports_credentials)
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://localhost:5176"])

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- MODELE BAZY DANYCH ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(50), nullable=False)
    xp = db.Column(db.Integer, default=0)

class Folder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, nullable=False)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    folder_id = db.Column(db.Integer, db.ForeignKey('folder.id'), nullable=False)

with app.app_context():
    db.create_all()

# --- SYSTEM LOGOWANIA Z SESJĄ ---

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    
    # 1. Sprawdzamy Admina
    if data['username'] == os.getenv('ADMIN_USERNAME') and data['password'] == os.getenv('ADMIN_PASSWORD'):
        session['user_id'] = 0 # Zapisujemy w sesji (na serwerze)!
        session['role'] = 'admin'
        return jsonify({"id": 0, "username": os.getenv('ADMIN_USERNAME'), "role": "admin", "xp": 9999})
    
    # 2. Sprawdzamy zwykłego usera
    user = User.query.filter_by(username=data['username'], password=data['password']).first()
    if user:
        session['user_id'] = user.id # Zapisujemy w sesji!
        session['role'] = 'user'
        return jsonify({"id": user.id, "username": user.username, "xp": user.xp, "role": "user"})
        
    return jsonify({"error": "Błędne dane logowania"}), 401

@app.route('/api/auth/me', methods=['GET'])
def get_me():
    """Ten endpoint sprawdza, czy użytkownik ma aktualną sesję (np. po odświeżeniu strony)"""
    user_id = session.get('user_id')
    
    if user_id is None:
        return jsonify({"error": "Brak aktywnej sesji"}), 401
        
    if user_id == 0:
        return jsonify({"id": 0, "username": os.getenv('ADMIN_USERNAME'), "role": "admin", "xp": 9999})
        
    user = User.query.get(user_id)
    if user:
        return jsonify({"id": user.id, "username": user.username, "xp": user.xp, "role": "user"})
        
    return jsonify({"error": "Nie znaleziono użytkownika"}), 404

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear() # Czyścimy sesję na serwerze
    return jsonify({"message": "Wylogowano"})

# --- PANEL ADMINA ---
@app.route('/api/admin/users', methods=['GET', 'POST'])
def handle_users():
    if request.method == 'GET':
        users = User.query.all()
        return jsonify([{"id": u.id, "username": u.username, "xp": u.xp} for u in users])
        
    if request.method == 'POST':
        data = request.json
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"error": "Taka nazwa użytkownika już istnieje!"}), 400
            
        new_user = User(username=data['username'], password=data['password'])
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Konto utworzone!", "user": {"id": new_user.id, "username": new_user.username, "xp": 0}})

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    folders = Folder.query.filter_by(user_id=user_id).all()
    for folder in folders:
        Task.query.filter_by(folder_id=folder.id).delete()
        db.session.delete(folder)
        
    user = User.query.get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "Użytkownik usunięty"})
    return jsonify({"error": "Nie znaleziono"}), 404

# --- PROJEKTY I ZADANIA ---
@app.route('/api/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    if user_id == 0: return jsonify({"xp": 9999})
    user = User.query.get(user_id)
    return jsonify({"xp": user.xp}) if user else jsonify({"error": "Brak"}), 404

@app.route('/api/folders/<int:user_id>', methods=['GET'])
def get_folders(user_id):
    folders = Folder.query.filter_by(user_id=user_id).all()
    return jsonify([{"id": f.id, "name": f.name} for f in folders])

@app.route('/api/folders', methods=['POST'])
def add_folder():
    data = request.json
    new_folder = Folder(name=data['name'], user_id=data['user_id'])
    db.session.add(new_folder)
    db.session.commit()
    return jsonify({"id": new_folder.id, "name": new_folder.name})

@app.route('/api/tasks/<int:user_id>', methods=['GET'])
def get_tasks(user_id):
    folders = Folder.query.filter_by(user_id=user_id).all()
    folder_ids = [f.id for f in folders]
    tasks = Task.query.filter(Task.folder_id.in_(folder_ids)).all()
    return jsonify([{"id": t.id, "title": t.title, "completed": t.completed, "folder_id": t.folder_id} for t in tasks])

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.json
    new_task = Task(title=data['title'], folder_id=data['folder_id'])
    db.session.add(new_task)
    db.session.commit()
    return jsonify({"id": new_task.id, "title": new_task.title, "completed": new_task.completed, "folder_id": new_task.folder_id})

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    task = Task.query.get(task_id)
    if 'completed' in data:
        if data['completed'] and not task.completed:
            folder = Folder.query.get(task.folder_id)
            if folder.user_id != 0:
                user = User.query.get(folder.user_id)
                user.xp += 25
        task.completed = data['completed']
    db.session.commit()
    return jsonify({"id": task.id, "title": task.title, "completed": task.completed})

if __name__ == '__main__':
    app.run(debug=True, port=5000)