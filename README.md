# Integrated Bioinformatics Analysis Platform

A scalable full-stack web application designed for bioinformatics researchers and students.
It features a React+Tailwind frontend and a Python Flask+Biopython backend.

## 🚀 Features
- **Sequence Processing:** DNA/RNA manipulations, GC%, Transcription.
- **ORF Finder:** Automatically detects reading frames and lists sequences.
- **Sequence Alignment:** Global / Local Pairwise alignment parameters.
- **NCBI BLAST Integration:** Queries against NCBI `nt` database.
- **Protein Analysis:** pI, MW, Hydrophobicity index, and amino acid composition.

## 📦 Folder Structure
```
/BioAnalysisPlatform
│── /backend/                 # Python Flask API Server
│   ├── app.py                # Main Application and Router
│   ├── requirements.txt      # Python dependencies (Biopython, Flask, etc.)
│   ├── bio_platform.db       # SQLite Database (Auto-generated history/auth)
│   └── /services/
│       └── bio_services.py   # Core algorithmic computation logic
│── /frontend/                # React Vite Frontend (Tailwind + Lucide)
│   ├── package.json
│   ├── vite.config.js
│   └── /src/                 # React component structures
```

## 🔌 API Documentation (Localhost:8000)
- **POST `/api/analyze-sequence`** : Returns GC content, transcribed mRNA, etc. (Input `{"sequence": "ATG..."}`)
- **POST `/api/orf`** : Extracts open reading frames arrays.
- **POST `/api/align`** : Returns alignment data. `{"seq1": "...", "seq2": "...", "type": "global"}`
- **POST `/api/blast`** : Submits to NCBI WWW wrapper. (Heavy computation)
- **POST `/api/protein-analysis`** : Analyzes peptides structurally.
- **GET `/api/history`** : Retreives previous sequence analysis instances from SQLite database.

## ⚙️ Setup and Installation

### Backend Setup:
```bash
cd backend
pip install -r requirements.txt
python app.py
```
*(Server will start on http://localhost:8000)*

### Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
*(React app will start on http://localhost:5173)*
