import html
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

from Bio.SeqUtils.ProtParam import ProteinAnalysis

DNA_BASES = set("ATGCN")
RNA_BASES = set("AUGCN")
PROTEIN_BASES = set("ACDEFGHIKLMNPQRSTVWYBXZ")
BLAST_URL = "https://blast.ncbi.nlm.nih.gov/Blast.cgi"


def process_fasta(sequence_string):
    lines = (sequence_string or "").splitlines()
    cleaned_lines = [line.strip() for line in lines if line.strip() and not line.startswith(">")]
    return "".join(cleaned_lines).replace(" ", "").replace("\t", "").upper()


def detect_sequence_type(raw_sequence):
    seq = process_fasta(raw_sequence)
    if not seq:
        return seq, None

    chars = set(seq)
    if chars.issubset(RNA_BASES):
        return seq, "rna"
    if chars.issubset(DNA_BASES):
        return seq, "dna"
    if chars.issubset(PROTEIN_BASES):
        return seq, "protein"
    return seq, "unknown"


def to_dna(seq, sequence_type):
    return seq.replace("U", "T") if sequence_type == "rna" else seq


def _validate_nucleotide_sequence(raw_sequence):
    seq, sequence_type = detect_sequence_type(raw_sequence)
    if not seq:
        return None, None, {"error": "Invalid or empty sequence"}
    if sequence_type not in {"dna", "rna"}:
        return None, None, {"error": "Sequence must contain only DNA or RNA bases (A, T/U, G, C, N)"}

    dna_seq = to_dna(seq, sequence_type)
    if any(base not in DNA_BASES for base in dna_seq):
        return None, None, {"error": "Sequence contains unsupported nucleotide characters"}
    return dna_seq, sequence_type, None


def _validate_sequence_for_blast(raw_sequence, program):
    seq, sequence_type = detect_sequence_type(raw_sequence)
    if not seq:
        return None, None, {"error": "Invalid or empty sequence"}

    if program == "blastn":
        if sequence_type not in {"dna", "rna"}:
            return None, None, {"error": "BLASTN requires a DNA or RNA sequence"}

        dna_seq = to_dna(seq, sequence_type)
        if any(base not in DNA_BASES for base in dna_seq):
            return None, None, {"error": "Sequence contains unsupported nucleotide characters"}

        resolved = dna_seq.replace("N", "")
        if len(resolved) < 15:
            return None, None, {"error": "Sequence too short for BLASTN (minimum 15 resolved bases required)"}
        return resolved, sequence_type, None

    if program == "blastp":
        if sequence_type != "protein":
            return None, None, {"error": "BLASTP requires a protein sequence"}
        if len(seq) < 8:
            return None, None, {"error": "Sequence too short for BLASTP (minimum 8 amino acids required)"}
        return seq, sequence_type, None

    return None, None, {"error": f"Unsupported BLAST program: {program}"}


def _alignment_trace(seq1, seq2, mode="global", match=2, mismatch=-1, gap=-2):
    n, m = len(seq1), len(seq2)
    score = [[0] * (m + 1) for _ in range(n + 1)]
    traceback = [[None] * (m + 1) for _ in range(n + 1)]

    if mode == "global":
        for i in range(1, n + 1):
            score[i][0] = i * gap
            traceback[i][0] = "up"
        for j in range(1, m + 1):
            score[0][j] = j * gap
            traceback[0][j] = "left"

    best_score = 0
    best_position = (0, 0)

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            diag = score[i - 1][j - 1] + (match if seq1[i - 1] == seq2[j - 1] else mismatch)
            up = score[i - 1][j] + gap
            left = score[i][j - 1] + gap

            if mode == "local":
                best = max(0, diag, up, left)
                score[i][j] = best
                if best == 0:
                    traceback[i][j] = None
                elif best == diag:
                    traceback[i][j] = "diag"
                elif best == up:
                    traceback[i][j] = "up"
                else:
                    traceback[i][j] = "left"

                if best > best_score:
                    best_score = best
                    best_position = (i, j)
            else:
                best = max(diag, up, left)
                score[i][j] = best
                if best == diag:
                    traceback[i][j] = "diag"
                elif best == up:
                    traceback[i][j] = "up"
                else:
                    traceback[i][j] = "left"

    if mode == "local":
        i, j = best_position
        final_score = best_score
    else:
        i, j = n, m
        final_score = score[n][m]

    align1 = []
    align2 = []
    while i > 0 or j > 0:
        direction = traceback[i][j]
        if mode == "local" and direction is None:
            break
        if direction == "diag":
            align1.append(seq1[i - 1])
            align2.append(seq2[j - 1])
            i -= 1
            j -= 1
        elif direction == "up":
            align1.append(seq1[i - 1])
            align2.append("-")
            i -= 1
        elif direction == "left":
            align1.append("-")
            align2.append(seq2[j - 1])
            j -= 1
        else:
            break

    aligned_seq1 = "".join(reversed(align1))
    aligned_seq2 = "".join(reversed(align2))
    return aligned_seq1, aligned_seq2, final_score


def match_line(seq1, seq2):
    return "".join("|" if a == b else " " for a, b in zip(seq1, seq2))


def color_alignment(seq1, seq2):
    colored = []
    for a, b in zip(seq1, seq2):
        char = html.escape(a)
        if a == b:
            colored.append(f'<span class="match">{char}</span>')
        elif a == "-" or b == "-":
            colored.append(f'<span class="gap">{char}</span>')
        else:
            colored.append(f'<span class="mismatch">{char}</span>')
    return "".join(colored)


def _alignment_counts(seq1, seq2):
    matches = mismatches = gaps = 0
    for a, b in zip(seq1, seq2):
        if a == b:
            matches += 1
        elif a == "-" or b == "-":
            gaps += 1
        else:
            mismatches += 1
    return matches, mismatches, gaps


def align_sequences(seq1, seq2, mode="global"):
    clean1, type1, error1 = _validate_nucleotide_sequence(seq1)
    clean2, type2, error2 = _validate_nucleotide_sequence(seq2)
    if error1 or error2:
        return {"error": "Both sequences must be valid DNA or RNA strings"}

    resolved1 = clean1.replace("N", "")
    resolved2 = clean2.replace("N", "")
    if not resolved1 or not resolved2:
        return {"error": "Both sequences must contain at least one resolved base"}

    normalized_mode = "local" if mode == "local" else "global"
    aligned1, aligned2, score = _alignment_trace(resolved1, resolved2, normalized_mode)
    if not aligned1 or not aligned2:
        return {"error": "No alignment found"}

    matches, mismatches, gaps = _alignment_counts(aligned1, aligned2)
    algorithm = "Smith-Waterman" if normalized_mode == "local" else "Needleman-Wunsch"

    return {
        "mode": normalized_mode,
        "algorithm": algorithm,
        "score": score,
        "sequence_types": [type1.upper(), type2.upper()],
        "aligned_seq1": aligned1,
        "aligned_seq2": aligned2,
        "seq1_html": color_alignment(aligned1, aligned2),
        "seq2_html": color_alignment(aligned2, aligned1),
        "match_line": match_line(aligned1, aligned2),
        "matches": matches,
        "mismatches": mismatches,
        "gaps": gaps,
        "alignment_length": len(aligned1),
    }


def _http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "BioAnalysisPlatform/1.0"})
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read().decode("utf-8", errors="replace")


def _http_post(url, payload):
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "BioAnalysisPlatform/1.0"})
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read().decode("utf-8", errors="replace")


def _extract_value(pattern, text):
    match = re.search(pattern, text)
    return match.group(1).strip() if match else None


def _submit_blast(sequence, program):
    response = _http_post(
        BLAST_URL,
        {
            "CMD": "Put",
            "PROGRAM": program,
            "DATABASE": "nt" if program == "blastn" else "nr",
            "QUERY": sequence,
            "HITLIST_SIZE": 5,
        },
    )
    rid = _extract_value(r"RID = ([^\n]+)", response)
    rtoe = _extract_value(r"RTOE = ([0-9]+)", response)
    if not rid:
        raise RuntimeError("NCBI did not return a request identifier")
    return rid, int(rtoe or "30")


def _poll_blast_results(rid, rtoe):
    initial_wait = max(15, min(max(rtoe, 15), 45))
    time.sleep(initial_wait)

    deadline = time.time() + 420
    while time.time() < deadline:
        search_info = _http_get(
            f"{BLAST_URL}?CMD=Get&RID={urllib.parse.quote(rid)}&FORMAT_OBJECT=SearchInfo"
        )
        if "Status=WAITING" in search_info:
            time.sleep(20)
            continue
        if "Status=FAILED" in search_info:
            raise RuntimeError("NCBI reported that the BLAST search failed")
        if "Status=UNKNOWN" in search_info:
            raise RuntimeError("NCBI no longer has this BLAST request")
        if "Status=READY" in search_info and "ThereAreHits=yes" not in search_info:
            return ""
        if "Status=READY" in search_info:
            return _http_get(
                f"{BLAST_URL}?CMD=Get&RID={urllib.parse.quote(rid)}&FORMAT_TYPE=XML"
            )
        time.sleep(20)

    raise TimeoutError("NCBI BLAST did not finish before the polling limit")


def _parse_blast_hits(xml_text):
    if not xml_text.strip():
        return []

    root = ET.fromstring(xml_text)
    hits = []
    for hit in root.findall(".//Hit"):
        title = hit.findtext("Hit_def", default="Unknown hit")
        accession = hit.findtext("Hit_accession", default="N/A")
        length = hit.findtext("Hit_len", default="0")
        organism = "Unknown"
        if "[" in title and "]" in title:
            organism = title.rsplit("[", 1)[-1].replace("]", "").strip()

        first_hsp = hit.find(".//Hsp")
        if first_hsp is None:
            continue

        hits.append(
            {
                "title": title,
                "accession": accession,
                "length": length,
                "score": first_hsp.findtext("Hsp_bit-score", default="0"),
                "e_value": first_hsp.findtext("Hsp_evalue", default="0"),
                "identity": first_hsp.findtext("Hsp_identity", default="0"),
                "alignment_length": first_hsp.findtext("Hsp_align-len", default="0"),
                "identities": f"{first_hsp.findtext('Hsp_identity', default='0')}/{first_hsp.findtext('Hsp_align-len', default='0')}",
                "organism": organism,
            }
        )
        if len(hits) >= 5:
            break
    return hits


def run_blast(raw_sequence, program="blastn"):
    clean_seq, sequence_type, error = _validate_sequence_for_blast(raw_sequence, program)
    if error:
        return error

    try:
        rid, rtoe = _submit_blast(clean_seq, program)
        xml_text = _poll_blast_results(rid, rtoe)
        hits = _parse_blast_hits(xml_text)
        if not hits:
            return {
                "hits": [],
                "message": "NCBI returned no strong hits for this query",
                "rid": rid,
                "program": program,
                "sequence_type": sequence_type,
            }
        return {"hits": hits, "rid": rid, "program": program, "sequence_type": sequence_type}
    except TimeoutError as exc:
        return {
            "error": "NCBI BLAST is still processing this sequence. Please retry in a moment with the same input.",
            "details": str(exc),
        }
    except Exception as exc:
        return {
            "error": "NCBI BLAST request failed. Please retry with a clean sequence or try again later.",
            "details": str(exc),
        }


def analyze_protein(raw_protein):
    seq = process_fasta(raw_protein)
    if not seq:
        return {"error": "Empty sequence"}
    if not set(seq).issubset(PROTEIN_BASES):
        return {"error": "Protein sequence must use standard amino acid letters only"}

    try:
        analyzed = ProteinAnalysis(seq)
        return {
            "length": len(seq),
            "weight": round(analyzed.molecular_weight(), 2),
            "pi": round(analyzed.isoelectric_point(), 2),
            "amino_count": analyzed.count_amino_acids(),
            "hydrophobicity": round(analyzed.gravy(), 3),
            "aromaticity": round(analyzed.aromaticity(), 3),
            "instability_index": round(analyzed.instability_index(), 2),
        }
    except Exception as exc:
        return {"error": str(exc)}
