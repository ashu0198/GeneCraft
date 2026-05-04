from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import datetime
from pathlib import Path
from services.bio_services import (
    align_sequences, run_blast, analyze_protein
)

app = Flask(__name__)
CORS(app)
DB_PATH = Path(__file__).with_name('bio_platform.db')

# Database Setup (SQLite)
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS history 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, tool TEXT, input_seq TEXT, timestamp DATETIME)''')
    conn.commit()
    conn.close()

init_db()

def log_history(user, tool, input_seq):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("INSERT INTO history (user, tool, input_seq, timestamp) VALUES (?, ?, ?, ?)", 
                  (user, tool, input_seq, datetime.datetime.now()))
        conn.commit()
        conn.close()
    except:
        pass

@app.route('/api/align', methods=['POST'])
def align_endpoint():
    data = request.get_json(silent=True) or {}
    seq1 = data.get('seq1', '')
    seq2 = data.get('seq2', '')
    type_ = data.get('type', 'global')
    res = align_sequences(seq1, seq2, type_)
    log_history('guest', 'align', f"{seq1[:10]}_{seq2[:10]}")
    return jsonify(res)

@app.route('/api/blast', methods=['POST'])
def blast_endpoint():
    data = request.get_json(silent=True) or {}
    seq = data.get('sequence', '')
    program = data.get('program', 'blastn')
    res = run_blast(seq, program)
    log_history('guest', 'blast', seq[:20])
    return jsonify(res)

@app.route('/api/protein-analysis', methods=['POST'])
def protein_endpoint():
    data = request.get_json(silent=True) or {}
    seq = data.get('sequence', '')
    res = analyze_protein(seq)
    log_history('guest', 'protein-analysis', seq[:20])
    return jsonify(res)

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT * FROM history ORDER BY timestamp DESC LIMIT 10")
        rows = c.fetchall()
        conn.close()
        return jsonify([{'id': r[0], 'user': r[1], 'tool': r[2], 'input': r[3], 'timestamp': r[4]} for r in rows])
    except:
        return jsonify([])

if __name__ == '__main__':
    app.run(debug=True, port=8000)
