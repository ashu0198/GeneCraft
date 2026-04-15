import React, { useState } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { 
  Dna, Search, Activity, FileSpreadsheet, AlignJustify, 
  History, TestTube, Save, ChevronRight, AlertCircle, CheckCircle2, Gamepad2, Globe 
} from 'lucide-react';
import ArcadeTab from './ArcadeTab';
import EvolutionTab from './EvolutionTab';

const API_URL = "http://127.0.0.1:8000/api";

const LoadingSpinner = () => (
  <div className="flex animate-pulse items-center gap-2 text-blue-600 font-medium">
    <div className="w-5 h-5 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    Processing Analysis...
  </div>
);

const Card = ({ title, children, className="" }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
    <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3 font-semibold text-slate-800 flex items-center gap-2">
      <ChevronRight size={16} className="text-blue-500" />
      {title}
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
);

const ErrorAlert = ({ message }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 my-4">
    <AlertCircle size={20} />
    <span className="font-medium">{message}</span>
  </div>
);

// === TABS ====
function SequenceTab() {
  const [seq, setSeq] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [orfs, setOrfs] = useState([]);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!seq) return;
    setLoading(true); setError(null);
    try {
      const res = await axios.post(`${API_URL}/analyze-sequence`, { sequence: seq });
      if(res.data.error) throw new Error(res.data.error);
      setData(res.data);
      
      // Auto fetch ORFs
      const orfRes = await axios.post(`${API_URL}/orf`, { sequence: seq });
      setOrfs(orfRes.data.orfs);
    } catch (err) {
      setError(err.message || 'Server connection failed.');
    }
    setLoading(false);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-5 space-y-6">
        <Card title="Input Biological Sequence">
          <label className="text-sm font-semibold text-slate-600 mb-2 block">DNA / RNA String (RAW or FASTA)</label>
          <textarea 
            className="w-full h-40 p-4 font-mono text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
            placeholder=">Sequence_1\nATGCGTACGTAGCTAG..."
            value={seq} onChange={(e)=>setSeq(e.target.value)}
          ></textarea>
          <button 
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold shadow-md transition-all flex justify-center items-center gap-2"
            onClick={analyze} disabled={loading}
          >
            {loading ? <LoadingSpinner /> : <><TestTube size={20} /> Execute Central Dogma Protocol</>}
          </button>
        </Card>
      </div>

      <div className="lg:col-span-7">
        {error && <ErrorAlert message={error} />}
        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card title="Analytics Chart" className="col-span-1">
                <div className="h-48 flex justify-center items-center">
                  <Plot
                    data={[{ values: [data.gc_content, 100-data.gc_content], labels: ['GC Content', 'AT Content'], type: 'pie', hole: 0.5, marker: {colors: ['#2563eb', '#cbd5e1']} }]}
                    layout={{ width: 220, height: 220, margin: {t:0, b:0, l:0, r:0}, showlegend: false }}
                    config={{ displayModeBar: false }}
                  />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-blue-600">{data.gc_content}%</div>
                    <div className="text-xs font-semibold text-slate-500">GC SATURATION</div>
                  </div>
                </div>
              </Card>
              <Card title="Properties" className="col-span-1">
                <ul className="space-y-4">
                  <li className="flex justify-between items-center pb-2 border-b"><span className="text-slate-500">Length</span> <span className="font-mono font-semibold">{data.length} bp</span></li>
                  <li className="flex justify-between items-center pb-2 border-b"><span className="text-slate-500">Transcription</span> <span className="font-mono text-emerald-600 font-semibold">{data.mrna.length} bases</span></li>
                  <li className="flex justify-between items-center pb-2"><span className="text-slate-500">Translated Peptides</span> <span className="font-mono text-indigo-600 font-semibold">{data.protein.length} AA</span></li>
                </ul>
              </Card>
            </div>

            <Card title="Structural Outputs">
               <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">mRNA Visual</div>
                    <pre className="p-3 bg-slate-900 text-emerald-400 rounded-md text-sm font-mono overflow-x-auto border border-emerald-900/50">{data.mrna}</pre>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Functional Protein</div>
                    <pre className="p-3 bg-slate-900 text-indigo-300 rounded-md text-sm font-mono overflow-x-auto border border-indigo-900/50">{data.protein}</pre>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Reverse Complement (3&apos; -&gt; 5&apos;)</div>
                    <pre className="p-3 bg-slate-100 text-slate-600 rounded-md text-sm font-mono overflow-x-auto border border-slate-200">{data.rev_comp}</pre>
                  </div>
               </div>
            </Card>

            <Card title="Open Reading Frames (ORFs)">
               {orfs.length === 0 ? <p className="text-slate-500">No standard ORFs detected.</p> : (
                 <div className="overflow-x-auto relative">
                   <table className="w-full text-sm text-left">
                     <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                       <tr><th className="py-3 px-4">Frame</th><th className="py-3 px-4">Start</th><th className="py-3 px-4">Stop</th><th className="py-3 px-4">Length</th></tr>
                     </thead>
                     <tbody>
                       {orfs.map((o, i) => (
                         <tr key={i} className="border-b bg-white hover:bg-slate-50 font-mono">
                           <td className="py-3 px-4 font-bold text-blue-600">{o.frame}</td>
                           <td className="py-3 px-4">{o.start}</td>
                           <td className="py-3 px-4">{o.stop}</td>
                           <td className="py-3 px-4 font-semibold">{o.length} bp</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function AlignmentTab() {
  const [s1, setS1] = useState(''); const [s2, setS2] = useState('');
  const [mode, setMode] = useState('global');
  const [data, setData] = useState(null); const [loading, setLoading] = useState(false);

  const align = async () => {
    if(!s1 || !s2) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/align`, {seq1: s1, seq2: s2, type: mode});
      setData(res.data);
    } catch (err) {}
    setLoading(false);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <Card title="Sequence Alignment Architecture">
         <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div><label className="text-sm font-semibold text-slate-600 block mb-1">Target Sequence A</label><textarea className="w-full p-3 border rounded text-sm font-mono h-24" value={s1} onChange={e=>setS1(e.target.value)}></textarea></div>
            <div><label className="text-sm font-semibold text-slate-600 block mb-1">Query Sequence B</label><textarea className="w-full p-3 border rounded text-sm font-mono h-24" value={s2} onChange={e=>setS2(e.target.value)}></textarea></div>
         </div>
         <div className="flex gap-4 items-center">
            <select className="border p-2 rounded text-sm font-semibold text-slate-700 bg-slate-50" value={mode} onChange={e=>setMode(e.target.value)}>
              <option value="global">Global (Needleman-Wunsch)</option>
              <option value="local">Local (Smith-Waterman)</option>
            </select>
            <button className="bg-indigo-600 text-white px-6 py-2 rounded font-semibold hover:bg-indigo-700 transition" onClick={align} disabled={loading}>{loading ? 'Aligning...' : 'Execute Alignment'}</button>
         </div>
      </Card>
      
      {data && (
        <Card title={`Consensus Outcome (Score: ${data.score})`}>
          <pre className="bg-slate-900 text-slate-300 p-6 rounded-lg font-mono text-sm overflow-x-auto leading-relaxed tracking-widest">{data.alignment_str}</pre>
        </Card>
      )}
    </div>
  )
}

function BlastTab() {
  const [seq, setSeq] = useState('');
  const [data, setData] = useState(null); const [loading, setLoading] = useState(false);

  const performBlast = async () => {
    if(seq.length < 15) return alert("Must exceed 15 bp");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/blast`, {sequence: seq});
      setData(res.data);
    } catch(e) {}
    setLoading(false);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <Card title="NCBI Database Cloud BLAST">
         <textarea className="w-full p-4 border rounded font-mono h-32 mb-4" placeholder="Enter query string..." value={seq} onChange={e=>setSeq(e.target.value)}></textarea>
         <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded transition" onClick={performBlast}>{loading ? 'Fetching from NCBI Servers... (might take 2 mins)' : 'Commence Global Search'}</button>
      </Card>

      {data && data.hits && (
        <Card title="Matched Homology">
          <div className="space-y-4">
            {data.hits.map((h, i) => (
              <div key={i} className="p-4 border border-emerald-100 bg-emerald-50/30 rounded-lg">
                <div className="font-semibold text-slate-800 mb-2">{h.title}</div>
                <div className="flex gap-6 text-sm text-slate-600 font-mono">
                  <span><strong className="text-slate-800">Score:</strong> {h.score}</span>
                  <span><strong className="text-slate-800">E-Value:</strong> {h.e_value}</span>
                  <span><strong className="text-slate-800">Identity:</strong> {h.identities}</span>
                  <span className="text-emerald-700 font-bold bg-emerald-100 px-2 rounded">{h.organism}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function ProteinTab() {
  const [seq, setSeq] = useState('');
  const [data, setData] = useState(null);

  const analyze = async () => {
    try {
      const res = await axios.post(`${API_URL}/protein-analysis`, {sequence: seq});
      setData(res.data);
    } catch(e) {}
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
      <Card title="Peptide String Analysis">
         <textarea className="w-full p-4 border rounded font-mono h-32 mb-4 uppercase" placeholder="Enter Protein sequence (M V L...)" value={seq} onChange={e=>setSeq(e.target.value)}></textarea>
         <button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-6 rounded transition" onClick={analyze}>Analyze Structure</button>
      </Card>
      {data && (
        <Card title="Properties">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-4 rounded text-center border"><div className="text-2xl font-bold">{data.weight}</div><div className="text-xs text-slate-500 font-bold mt-1">MOL. WEIGHT (Da)</div></div>
             <div className="bg-slate-50 p-4 rounded text-center border"><div className="text-2xl font-bold">{data.pi}</div><div className="text-xs text-slate-500 font-bold mt-1">ISOELECTRIC PT (pI)</div></div>
             <div className="bg-slate-50 p-4 rounded text-center border"><div className="text-2xl font-bold">{data.hydrophobicity}</div><div className="text-xs text-slate-500 font-bold mt-1">GRAVY SCORE</div></div>
             <div className="bg-slate-50 p-4 rounded text-center border"><div className="text-2xl font-bold">{Object.keys(data.amino_count || {}).length} Types</div><div className="text-xs text-slate-500 font-bold mt-1">AMINO ACID DIVERSITY</div></div>
          </div>
        </Card>
      )}
    </div>
  )
}

// === MAIN APP ====
const TabBtn = ({ active, set, icon: Icon, label }) => (
  <button onClick={()=>set()} className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all border-b-[3px] ${active ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
    <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} /> {label}
  </button>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('sequence');
  
  return (
    <div className="min-h-screen flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10 sticky top-0 shadow-sm">
           <div className="flex items-center gap-4">
             <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg ring-4 ring-blue-50"><Dna className="text-white w-6 h-6" /></div>
             <div>
                <h1 className="text-2xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">BioAnalysis Platform</h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Enterprise Bioinformatics Suite</p>
             </div>
           </div>
           <nav className="flex items-center gap-4">
              <button className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2"><History size={16}/> Logs</button>
              <button className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition shadow flex items-center gap-2"><Save size={16}/> Cache Status</button>
           </nav>
        </header>

        <div className="bg-white border-b border-slate-200 flex overflow-x-auto shadow-sm">
          <TabBtn active={activeTab==='sequence'} set={()=>setActiveTab('sequence')} icon={Activity} label="Sequence Processing" />
          <TabBtn active={activeTab==='align'} set={()=>setActiveTab('align')} icon={AlignJustify} label="Pairwise Alignment" />
          <TabBtn active={activeTab==='blast'} set={()=>setActiveTab('blast')} icon={Search} label="NCBI Cloud BLAST" />
          <TabBtn active={activeTab==='protein'} set={()=>setActiveTab('protein')} icon={FileSpreadsheet} label="Protein Dynamics" />
          <TabBtn active={activeTab==='arcade'} set={()=>setActiveTab('arcade')} icon={Gamepad2} label="Shooter Arcade" />
          <TabBtn active={activeTab==='darwin'} set={()=>setActiveTab('darwin')} icon={Globe} label="Darwin Simulator" />
        </div>
        
        <main className="flex-1 w-full max-w-screen-2xl mx-auto p-8">
           {activeTab === 'sequence' && <SequenceTab />}
           {activeTab === 'align' && <AlignmentTab />}
           {activeTab === 'blast' && <BlastTab />}
           {activeTab === 'protein' && <ProteinTab />}
           {activeTab === 'arcade' && <ArcadeTab />}
           {activeTab === 'darwin' && <EvolutionTab />}
        </main>
    </div>
  )
}
