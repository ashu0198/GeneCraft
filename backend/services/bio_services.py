from Bio.Seq import Seq
from Bio.SeqUtils.ProtParam import ProteinAnalysis
from Bio import Align
from Bio.Blast import NCBIWWW
from Bio.Blast import NCBIXML

def process_fasta(dna_string):
    lines = dna_string.split('\n')
    if lines and lines[0].startswith('>'):
        lines = lines[1:]
    seq = "".join(lines).replace(' ', '').replace('\r', '').upper()
    return seq

def process_sequence(raw_dna):
    seq_with_n = process_fasta(raw_dna)
    seq = seq_with_n.replace('N', '')
    if not seq:
        return {"error": "Invalid or empty sequence"}
    
    dna_seq = Seq(seq)
    g = seq.count('G')
    c = seq.count('C')
    a = seq.count('A')
    t = seq.count('T')
    total = g + c + a + t
    gc_percent = ((g + c) / total * 100) if total > 0 else 0
    
    mrna_seq = dna_seq.transcribe()
    protein_seq = dna_seq.translate(table=1) # standard
    rev_comp = dna_seq.reverse_complement()
    
    return {
        "length": len(seq),
        "gc_content": round(gc_percent, 2),
        "mrna": str(mrna_seq),
        "protein": str(protein_seq),
        "rev_comp": str(rev_comp),
        "clean_seq": seq
    }

def find_orfs(raw_dna):
    seq = process_fasta(raw_dna).replace('N', '')
    seq_len = len(seq)
    orfs = []
    stops = ['TAA', 'TAG', 'TGA']
    for frame in range(3):
        for i in range(frame, seq_len - 2, 3):
            if seq[i:i+3] == 'ATG':
                for j in range(i+3, seq_len - 2, 3):
                    if seq[j:j+3] in stops:
                        orfs.append({
                            "start": i + 1,
                            "stop": j + 3,
                            "frame": f"+{frame+1}",
                            "length": (j + 3 - i),
                            "sequence": seq[i:j+3]
                        })
                        break
    orfs.sort(key=lambda x: x['length'], reverse=True)
    return orfs

def align_sequences(seq1, seq2, mode='global'):
    s1 = process_fasta(seq1).replace('N', '')
    s2 = process_fasta(seq2).replace('N', '')
    aligner = Align.PairwiseAligner()
    aligner.mode = mode
    aligner.match_score = 2.0
    aligner.mismatch_score = -1.0
    aligner.open_gap_score = -0.5
    aligner.extend_gap_score = -0.1
    
    alignments = aligner.align(s1, s2)
    if not alignments:
         return {"error": "No alignment found"}
    best = alignments[0]
    return {
        "score": best.score,
        "alignment_str": str(best)
    }

def run_blast(raw_dna):
    seq = process_fasta(raw_dna).replace('N', '')
    if len(seq) < 15:
        return {"error": "Sequence too short for BLAST (need >15)"}
    try:
        handle = NCBIWWW.qblast("blastn", "nt", seq, hitlist_size=5)
        records = NCBIXML.read(handle)
        hits = []
        for align in records.alignments:
            for hsp in align.hsps:
                hits.append({
                    "title": align.title,
                    "score": hsp.score,
                    "e_value": hsp.expect,
                    "identities": f"{hsp.identities}/{hsp.align_length}",
                    "organism": align.hit_def.split('[')[-1].replace(']', '') if '[' in align.hit_def else 'Unknown'
                })
        return {"hits": hits}
    except Exception as e:
        return {"error": str(e)}

def analyze_protein(raw_prot):
    seq = process_fasta(raw_prot)
    if not seq: return {"error": "Empty sequence"}
    try:
        analyzed = ProteinAnalysis(seq)
        return {
            "weight": round(analyzed.molecular_weight(), 2),
            "pi": round(analyzed.isoelectric_point(), 2),
            "amino_count": analyzed.count_amino_acids(),
            "hydrophobicity": round(analyzed.gravy(), 3)
        }
    except Exception as e:
        return {"error": str(e)}
