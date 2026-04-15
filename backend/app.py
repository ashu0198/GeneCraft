from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import datetime
from services.bio_services import (
    process_sequence, find_orfs, align_sequences, run_blast, analyze_protein
)
from services.evolution_service import engine

app = Flask(__name__)
CORS(app)

# Database Setup (SQLite)
def init_db():
    conn = sqlite3.connect('bio_platform.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS history 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, tool TEXT, input_seq TEXT, timestamp DATETIME)''')
    conn.commit()
    conn.close()

init_db()

def log_history(user, tool, input_seq):
    try:
        conn = sqlite3.connect('bio_platform.db')
        c = conn.cursor()
        c.execute("INSERT INTO history (user, tool, input_seq, timestamp) VALUES (?, ?, ?, ?)", 
                  (user, tool, input_seq, datetime.datetime.now()))
        conn.commit()
        conn.close()
    except:
        pass

@app.route('/api/analyze-sequence', methods=['POST'])
def analyze_sequence():
    data = request.json
    seq = data.get('sequence', '')
    res = process_sequence(seq)
    if not res.get('error'):
        log_history('guest', 'analyze-sequence', seq[:20])
    return jsonify(res)

@app.route('/api/orf', methods=['POST'])
def orf_endpoint():
    data = request.json
    seq = data.get('sequence', '')
    res = find_orfs(seq)
    log_history('guest', 'orf', seq[:20])
    return jsonify({"orfs": res})

@app.route('/api/align', methods=['POST'])
def align_endpoint():
    data = request.json
    seq1 = data.get('seq1', '')
    seq2 = data.get('seq2', '')
    type_ = data.get('type', 'global')
    res = align_sequences(seq1, seq2, type_)
    log_history('guest', 'align', f"{seq1[:10]}_{seq2[:10]}")
    return jsonify(res)

@app.route('/api/blast', methods=['POST'])
def blast_endpoint():
    data = request.json
    seq = data.get('sequence', '')
    res = run_blast(seq)
    log_history('guest', 'blast', seq[:20])
    return jsonify(res)

@app.route('/api/protein-analysis', methods=['POST'])
def protein_endpoint():
    data = request.json
    seq = data.get('sequence', '')
    res = analyze_protein(seq)
    log_history('guest', 'protein-analysis', seq[:20])
    return jsonify(res)

# ==========================================
# DARWIN EXPERIMENT API
# ==========================================
@app.route('/api/darwin/state', methods=['GET'])
def get_darwin_state():
    return jsonify(engine.get_state())

@app.route('/api/darwin/init', methods=['POST'])
def init_darwin():
    return jsonify(engine.init_sim())

@app.route('/api/darwin/env', methods=['POST'])
def set_darwin_env():
    return jsonify(engine.set_env(request.json))

@app.route('/api/darwin/mutate', methods=['POST'])
def darwin_mutate():
    data = request.json
    return jsonify(engine.mutate_dna(data['id'], data['pos'], data['base']))

@app.route('/api/darwin/simulate', methods=['POST'])
def simulate_darwin():
    return jsonify(engine.apply_generation())

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        conn = sqlite3.connect('bio_platform.db')
        c = conn.cursor()
        c.execute("SELECT * FROM history ORDER BY timestamp DESC LIMIT 10")
        rows = c.fetchall()
        conn.close()
        return jsonify([{'id': r[0], 'user': r[1], 'tool': r[2], 'input': r[3], 'timestamp': r[4]} for r in rows])
    except:
        return jsonify([])

if __name__ == '__main__':
    app.run(debug=True, port=8000)
