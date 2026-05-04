import React, { useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  AlignJustify,
  ChevronRight,
  FileSpreadsheet,
  Gamepad2,
  Search,
} from 'lucide-react';
import ArcadeTab from './ArcadeTab';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

const blastApi = axios.create({
  baseURL: API_URL,
  timeout: 0,
});

const GeneCraftLogo = () => (
  <div className="flex items-center gap-4">
    <div className="genecraft-logo">
      <svg viewBox="0 0 80 80" aria-hidden="true" className="h-14 w-14">
        <defs>
          <linearGradient id="gcFrame" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00C6FF" />
            <stop offset="100%" stopColor="#00F2FE" />
          </linearGradient>
          <linearGradient id="gcHelix" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FF88" />
            <stop offset="100%" stopColor="#00F2FE" />
          </linearGradient>
        </defs>
        <path
          d="M24 10H56L70 24V56L56 70H24L10 56V24Z"
          fill="rgba(11,15,25,0.72)"
          stroke="url(#gcFrame)"
          strokeWidth="2.5"
        />
        <path
          d="M28 22C40 22 40 58 52 58"
          fill="none"
          stroke="url(#gcHelix)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M52 22C40 22 40 58 28 58"
          fill="none"
          stroke="#00C6FF"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path d="M31 30H49" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
        <path d="M30 40H50" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
        <path d="M31 50H49" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
        <circle cx="28" cy="22" r="3" fill="#00F2FE" />
        <circle cx="52" cy="22" r="3" fill="#00FF88" />
        <circle cx="28" cy="58" r="3" fill="#00FF88" />
        <circle cx="52" cy="58" r="3" fill="#00F2FE" />
      </svg>
    </div>
    <div>
      <div className="text-2xl font-black tracking-[0.18em] text-white uppercase">Gene<span className="text-cyan-300">Craft</span></div>
    </div>
  </div>
);

const Card = ({ title, children, className = '' }) => (
  <section className={`rounded-3xl border border-cyan-400/10 bg-white/6 shadow-[0_0_30px_rgba(0,255,255,0.06)] backdrop-blur-xl ${className}`}>
    <div className="border-b border-cyan-400/10 px-5 py-4">
      <div className="flex items-center gap-2 text-white">
        <ChevronRight size={16} className="text-cyan-600" />
        <h2 className="font-semibold">{title}</h2>
      </div>
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const ErrorAlert = ({ message }) => (
  <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
    <div className="flex items-start gap-3">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  </div>
);

const LoadingSpinner = ({ label }) => (
  <span className="inline-flex items-center gap-2 font-medium">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
    {label}
  </span>
);

async function request(path, payload, client = api) {
  try {
    const res = await client.post(path, payload);
    if (res.data?.error) {
      const detail = res.data?.details ? ` (${res.data.details})` : '';
      throw new Error(`${res.data.error}${detail}`);
    }
    return res.data;
  } catch (err) {
    if (err.response?.data?.error) {
      const detail = err.response.data?.details ? ` (${err.response.data.details})` : '';
      throw new Error(`${err.response.data.error}${detail}`);
    }
    if (err.code === 'ERR_NETWORK') {
      throw new Error('Cannot reach the backend API. Start the Flask server on http://127.0.0.1:8000 and retry.');
    }
    if (err.message) {
      throw err;
    }
    throw new Error('Request failed.');
  }
}

function AlignmentTab() {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [mode, setMode] = useState('global');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const align = async () => {
    if (!s1.trim() || !s2.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await request('/align', { seq1: s1, seq2: s2, type: mode });
      setData(result);
    } catch (err) {
      setError(err.message || 'Alignment failed.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Alignment Workspace">
        <div className="grid gap-4 md:grid-cols-2">
          <textarea
            className="h-36 w-full rounded-2xl border border-cyan-400/15 bg-[#101826] p-4 font-mono text-sm text-cyan-200 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
            placeholder="ATGCGTACGTTAGC"
            value={s1}
            onChange={(e) => setS1(e.target.value)}
          />
          <textarea
            className="h-36 w-full rounded-2xl border border-cyan-400/15 bg-[#101826] p-4 font-mono text-sm text-cyan-200 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
            placeholder="ATGCGGACGTCAGC"
            value={s2}
            onChange={(e) => setS2(e.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="rounded-2xl border border-cyan-400/15 bg-[#101826] px-4 py-2 text-sm font-medium text-cyan-100"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="global">Global alignment - Needleman-Wunsch</option>
              <option value="local">Local alignment - Smith-Waterman</option>
            </select>
            <div className="rounded-2xl border border-cyan-400/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              Green = match, red = mismatch, yellow = gap
            </div>
          </div>
          <button
            className="rounded-2xl bg-[linear-gradient(90deg,#00C6FF,#00F2FE)] px-5 py-2.5 font-semibold text-[#0B0F19] transition hover:scale-[1.03] hover:shadow-[0_0_18px_rgba(0,242,254,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={align}
            disabled={loading}
          >
            {loading ? <LoadingSpinner label="Aligning..." /> : 'Run Alignment'}
          </button>
        </div>
      </Card>

      {error ? <ErrorAlert message={error} /> : null}

      {data ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            <Card title="Algorithm">
              <div className="text-lg font-black text-white">{data.algorithm}</div>
              <div className="mt-2 text-sm text-slate-400">{data.mode === 'global' ? 'Full-length comparison' : 'Best local region'}</div>
            </Card>
            <Card title="Score">
              <div className="text-3xl font-black text-cyan-300">{data.score}</div>
            </Card>
            <Card title="Matches">
              <div className="text-3xl font-black text-emerald-600">{data.matches}</div>
            </Card>
            <Card title="Mismatches">
              <div className="text-3xl font-black text-rose-600">{data.mismatches}</div>
            </Card>
            <Card title="Gaps">
              <div className="text-3xl font-black text-amber-500">{data.gaps}</div>
            </Card>
          </div>

          <Card title="Traceback Alignment">
            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <div className="rounded-2xl border border-cyan-400/10 bg-white/5 px-4 py-2 text-slate-300">
                <span className="font-semibold text-white">Sequence 1:</span> {data.sequence_types?.[0] || 'DNA'}
              </div>
              <div className="rounded-2xl border border-cyan-400/10 bg-white/5 px-4 py-2 text-slate-300">
                <span className="font-semibold text-white">Sequence 2:</span> {data.sequence_types?.[1] || 'DNA'}
              </div>
              <div className="rounded-2xl border border-cyan-400/10 bg-white/5 px-4 py-2 text-slate-300">
                <span className="font-semibold text-white">Alignment length:</span> {data.alignment_length}
              </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-cyan-400/10 bg-[#08111d] p-5 shadow-inner">
              <pre
                className="alignment"
                dangerouslySetInnerHTML={{ __html: data.seq1_html }}
              />
              <pre className="alignment alignment-line">{data.match_line}</pre>
              <pre
                className="alignment"
                dangerouslySetInnerHTML={{ __html: data.seq2_html }}
              />
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function BlastTab() {
  const [seq, setSeq] = useState('');
  const [program, setProgram] = useState('blastn');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const performBlast = async () => {
    if (!seq.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await request('/blast', { sequence: seq, program }, blastApi);
      setData(result);
    } catch (err) {
      setError(err.message || 'BLAST request failed.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="NCBI BLAST">
        <div className="space-y-4">
          <select
            className="rounded-2xl border border-cyan-400/15 bg-[#101826] px-4 py-2 text-sm font-medium text-cyan-100"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          >
            <option value="blastn">BLASTN (DNA/RNA)</option>
            <option value="blastp">BLASTP (Protein)</option>
          </select>
          <textarea
            className="h-36 w-full rounded-2xl border border-cyan-400/15 bg-[#101826] p-4 font-mono text-sm text-cyan-200"
            placeholder={program === 'blastp' ? 'Paste protein query' : 'Paste DNA or RNA query'}
            value={seq}
            onChange={(e) => setSeq(e.target.value)}
          />
        </div>
        <button className="mt-4 rounded-2xl bg-[linear-gradient(90deg,#00C6FF,#00F2FE)] px-5 py-2.5 font-semibold text-[#0B0F19] transition hover:scale-[1.03] hover:shadow-[0_0_18px_rgba(0,242,254,0.45)] disabled:opacity-60" onClick={performBlast} disabled={loading}>
          {loading ? 'Running BLAST...' : 'Run BLAST'}
        </button>
      </Card>

      {error ? <ErrorAlert message={error} /> : null}
      {data?.hits ? (
        <Card title={data.rid ? `RID ${data.rid}` : 'Hits'}>
          {data.message ? (
            <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              {data.message}
            </div>
          ) : null}
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <span className="font-semibold text-white">Program:</span> {(data.program || program).toUpperCase()}
            </div>
            <div className="rounded-2xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <span className="font-semibold text-white">Detected input:</span> {(data.sequence_type || 'unknown').toUpperCase()}
            </div>
          </div>
          {data.hits.length === 0 ? (
            <div className="text-sm text-slate-400">No hits</div>
          ) : (
            <div className="space-y-4">
              {data.hits.map((hit, index) => (
                <article key={`${hit.title}-${index}`} className="rounded-2xl border border-cyan-400/10 bg-white/5 p-4">
                  <h3 className="font-semibold text-white">{hit.title}</h3>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-4">
                    <div><span className="font-semibold text-cyan-200">Score:</span> {hit.score}</div>
                    <div><span className="font-semibold text-cyan-200">E-value:</span> {hit.e_value}</div>
                    <div><span className="font-semibold text-cyan-200">Identity:</span> {hit.identities}</div>
                    <div><span className="font-semibold text-cyan-200">Organism:</span> {hit.organism}</div>
                    <div><span className="font-semibold text-cyan-200">Accession:</span> {hit.accession}</div>
                    <div><span className="font-semibold text-cyan-200">Hit length:</span> {hit.length}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}

function ProteinTab() {
  const [seq, setSeq] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!seq.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await request('/protein-analysis', { sequence: seq });
      setData(result);
    } catch (err) {
      setError(err.message || 'Protein analysis failed.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const aminoSummary = useMemo(() => {
    if (!data?.amino_count) return [];
    return Object.entries(data.amino_count).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
      <Card title="Protein">
        <textarea className="h-40 w-full rounded-2xl border border-cyan-400/15 bg-[#101826] p-4 font-mono text-sm uppercase text-cyan-200" placeholder="MKTFFVIL" value={seq} onChange={(e) => setSeq(e.target.value.toUpperCase())} />
        <button className="mt-4 rounded-2xl bg-[linear-gradient(90deg,#00C6FF,#00F2FE)] px-5 py-2.5 font-semibold text-[#0B0F19] transition hover:scale-[1.03] hover:shadow-[0_0_18px_rgba(0,242,254,0.45)] disabled:opacity-60" onClick={analyze} disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
        {error ? <div className="mt-4"><ErrorAlert message={error} /></div> : null}
      </Card>

      {data ? (
        <div className="space-y-6">
          <Card title="Properties">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-cyan-400/10 bg-white/5 p-4 text-center"><div className="text-2xl font-black text-white">{data.length}</div><div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Length</div></div>
              <div className="rounded-2xl border border-cyan-400/10 bg-white/5 p-4 text-center"><div className="text-2xl font-black text-white">{data.weight}</div><div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Weight</div></div>
              <div className="rounded-2xl border border-cyan-400/10 bg-white/5 p-4 text-center"><div className="text-2xl font-black text-white">{data.pi}</div><div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">pI</div></div>
              <div className="rounded-2xl border border-cyan-400/10 bg-white/5 p-4 text-center"><div className="text-2xl font-black text-white">{data.hydrophobicity}</div><div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">GRAVY</div></div>
            </div>
          </Card>

          <Card title="Amino Acids">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {aminoSummary.map(([amino, count]) => (
                <div key={amino} className="rounded-2xl border border-cyan-400/10 bg-white/5 px-4 py-3">
                  <div className="text-lg font-black text-white">{amino}</div>
                  <div className="text-sm text-slate-400">{count}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

const TabButton = ({ active, icon, label, onClick }) => {
  const IconComponent = icon;
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
        active ? 'bg-[linear-gradient(90deg,#00C6FF,#00F2FE)] text-[#0B0F19] shadow-[0_0_24px_rgba(0,242,254,0.2)]' : 'text-slate-300 hover:bg-white/8 hover:text-white'
      }`}
    >
      <IconComponent size={18} className={active ? 'text-[#0B0F19]' : 'text-cyan-300'} />
      <span>{label}</span>
    </button>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('align');

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#0B0F19,#0f2027,#203a43,#2c5364)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-cyan-400/10 bg-[#0B0F19]/75 px-4 py-5 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-[340px] lg:border-b-0 lg:border-r lg:px-6">
          <div className="rounded-3xl border border-cyan-400/10 bg-white/5 p-4">
            <GeneCraftLogo />
          </div>

          <div className="mt-6 space-y-2">
            <TabButton active={activeTab === 'align'} onClick={() => setActiveTab('align')} icon={AlignJustify} label="Alignment" />
            <TabButton active={activeTab === 'blast'} onClick={() => setActiveTab('blast')} icon={Search} label="NCBI BLAST" />
            <TabButton active={activeTab === 'protein'} onClick={() => setActiveTab('protein')} icon={FileSpreadsheet} label="Protein" />
            <TabButton active={activeTab === 'arcade'} onClick={() => setActiveTab('arcade')} icon={Gamepad2} label="Arcade" />
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {activeTab === 'align' && <AlignmentTab />}
          {activeTab === 'blast' && <BlastTab />}
          {activeTab === 'protein' && <ProteinTab />}
          {activeTab === 'arcade' && <ArcadeTab />}
        </main>
      </div>
    </div>
  );
}
