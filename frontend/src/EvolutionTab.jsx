import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = "http://127.0.0.1:8000/api/darwin";

const Card = ({ title, children, className="" }) => (
  <div className={`bg-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden ${className}`}>
    <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-2 font-black text-slate-300 text-xs tracking-wider uppercase flex justify-between items-center">
      {title}
    </div>
    <div className="p-4">
      {children}
    </div>
  </div>
);

const LineChart = ({ history }) => {
    if (!history || history.length < 2) return <div className="text-slate-500 text-xs py-10 text-center">Run generations to plot</div>;

    const w = 300; const h = 120;
    const maxPop = Math.max(...history.map(x => x.size), 10);
    const maxFit = Math.max(...history.map(x => x.avg_fitness), 10);
    const xStep = w / (history.length - 1);

    const popPoints = history.map((d, i) => `${i * xStep},${h - (d.size / maxPop) * h}`).join(' ');
    const fitPoints = history.map((d, i) => `${i * xStep},${h - (d.avg_fitness / maxFit) * h}`).join(' ');

    return (
        <div className="relative w-full h-[140px] flex items-end">
            <div className="w-full h-full relative border-l border-b border-slate-700 ml-4 mb-4">
                <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
                    <polyline points={popPoints} fill="none" stroke="#0ea5e9" strokeWidth="2" />
                    <polyline points={fitPoints} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4,3" />
                </svg>
            </div>
            <div className="absolute top-0 right-0 text-[10px] font-bold text-sky-500">Max Pop: {maxPop}</div>
            <div className="absolute top-4 right-0 text-[10px] font-bold text-emerald-500">Max Fit: {maxFit}</div>
        </div>
    );
};

export default function EvolutionTab() {
  const [simState, setSimState] = useState(null);
  const [selectedOrgIdx, setSelectedOrgIdx] = useState(0);
  const [autoEvolve, setAutoEvolve] = useState(false);
  const [crisisActive, setCrisisActive] = useState(null);
  const [alertMsg, setAlertMsg] = useState("");
  const [hintMsg, setHintMsg] = useState("Adjust sliders to shape evolution. Stable proteins survive heat.");

  const envRef = useRef({temperature: 50, moisture: 50, pollution: 10});
  const canvasRef = useRef(null);
  const entitiesRef = useRef([]);

  const syncEntities = (data) => {
     const { population_size, all_fitness } = data;
     const current = entitiesRef.current;
     
     if (population_size > current.length) {
         const diff = population_size - current.length;
         for (let i=0; i<diff; i++) {
             current.push({
                 x: 300 + (Math.random()-0.5)*150,
                 y: 250 + (Math.random()-0.5)*150,
                 vx: (Math.random()-0.5)*2,
                 vy: (Math.random()-0.5)*2,
                 targetRadius: 3 + Math.random()*2, currRadius: 0,
                 color: '#10b981'
             });
         }
     } else if (population_size < current.length) {
         // Randomly remove
         current.splice(0, current.length - population_size);
     }
     
     if (all_fitness && all_fitness.length > 0) {
         const maxFit = Math.max(...all_fitness, 1);
         current.forEach((e, i) => {
             const fit = all_fitness[i] || 0;
             const ratio = fit / maxFit;
             if (ratio > 0.7) e.color = '#4ade80'; // Green = High
             else if (ratio > 0.4) e.color = '#facc15'; // Yellow = Med
             else e.color = '#ef4444'; // Red = Low
         });
     }
  };

  const fetchState = async () => {
    try {
      const res = await axios.get(`${API_URL}/state`);
      if (res.data && res.data.environment) {
          setSimState(res.data);
          envRef.current = res.data.environment;
          syncEntities(res.data);
      }
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchState(); }, []);

  const initSim = async () => {
    try {
        const res = await axios.post(`${API_URL}/init`);
        if (res.data && res.data.environment) { 
            setSimState(res.data); envRef.current = res.data.environment; 
            entitiesRef.current = []; syncEntities(res.data); setSelectedOrgIdx(0); 
        }
    } catch(e) { console.error(e); }
  };

  const updateEnv = async (key, val) => {
    try {
        const env = { ...envRef.current, [key]: Number(val) };
        const res = await axios.post(`${API_URL}/env`, env);
        if (res.data) { setSimState(res.data); envRef.current = res.data.environment; }
    } catch(e) { console.error(e); }
  };

  const forceEnv = async (t, m, p) => {
      try {
        const env = { temperature: t, moisture: m, pollution: p };
        const res = await axios.post(`${API_URL}/env`, env);
        if (res.data) { setSimState(res.data); envRef.current = res.data.environment; }
      } catch(e) {}
  };

  const simulateGen = async () => {
    try {
        const res = await axios.post(`${API_URL}/simulate`);
        if (res.data && res.data.history) {
            setSimState(res.data);
            syncEntities(res.data);
        }
    } catch(e) { console.error(e); }
  };

  const mutateDna = async (pos, newBase) => {
    try {
        const res = await axios.post(`${API_URL}/mutate`, { id: selectedOrgIdx, pos: pos, base: newBase });
        if (res.data && res.data.environment) setSimState(res.data);
    } catch(e) { console.error(e); }
  };

  // ----- CANVAS RENDER ENGINE -----
  useEffect(() => {
     let animId;
     const W = 600, H = 500;
     const ctx = canvasRef.current?.getContext('2d');
     if (!ctx) return;

     const IslandRadius = { normal: 220, flood: 130 };
     let currentRadius = IslandRadius.normal;

     const render = () => {
         // Smooth water transition
         const targetR = (crisisActive === 'Rising Water Level') ? IslandRadius.flood : IslandRadius.normal;
         currentRadius += (targetR - currentRadius) * 0.05;

         // Ocean 
         ctx.fillStyle = crisisActive === 'Rising Water Level' ? '#0c4a6e' : '#0369a1';
         ctx.fillRect(0,0,W,H);
         
         // Ocean Waves
         ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
         for(let i=0; i<3; i++) {
             ctx.beginPath(); ctx.arc(W/2, H/2, currentRadius + 20 + Math.sin(Date.now()/500 + i)*10, 0, Math.PI*2); ctx.stroke();
         }

         // Island Land
         ctx.beginPath();
         ctx.arc(W/2, H/2, currentRadius, 0, Math.PI*2);
         // Color land based on crisis
         if (crisisActive === 'Temperature Rise') {
             ctx.fillStyle = '#b45309'; // scorched earth
         } else if (crisisActive === 'Pollution Spike') {
             ctx.fillStyle = '#4d7c0f'; // sickly green
         } else {
             ctx.fillStyle = '#15803d'; // lush green
         }
         ctx.fill();
         ctx.shadowBlur = 0;

         // Entities
         entitiesRef.current.forEach(e => {
            e.x += e.vx; e.y += e.vy;
            
            // Boundary bounce
            const dx = e.x - W/2; const dy = e.y - H/2;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > currentRadius - 5) {
               // Push back inside and reverse velocity
               const angle = Math.atan2(dy, dx);
               e.x = W/2 + Math.cos(angle) * (currentRadius - 6);
               e.y = H/2 + Math.sin(angle) * (currentRadius - 6);
               e.vx *= -1; e.vy *= -1;
               
               // Random walk change
               e.vx += (Math.random()-0.5);
               e.vy += (Math.random()-0.5);
            }
            
            if (e.currRadius < e.targetRadius) e.currRadius += 0.2;
            
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.currRadius, 0, Math.PI*2);
            ctx.fillStyle = e.color;
            ctx.fill(); 
         });
         
         animId = requestAnimationFrame(render);
     }
     render();
     return () => cancelAnimationFrame(animId);
  }, [crisisActive]);

  // ----- AUTO EVOLVE LOOP -----
  useEffect(() => {
      if (!autoEvolve) return;
      const t = setInterval(() => { simulateGen(); }, 2500);
      return () => clearInterval(t);
  }, [autoEvolve]);

  // ----- CRISIS ENGINE -----
  useEffect(() => {
      const c = setInterval(() => {
          const crises = ['Temperature Rise', 'Rising Water Level', 'Pollution Spike', 'Overpopulation'];
          const event = crises[Math.floor(Math.random()*crises.length)];
          
          setCrisisActive(event);
          setAlertMsg(`⚠️ CRISIS INITIATED: ${event}`);
          
          // Apply effects
          if (event === 'Temperature Rise') {
             forceEnv(95, envRef.current.moisture, envRef.current.pollution);
             setHintMsg("Temperature is rising — select mutations that increase protein stability (V, L, I, F).");
          } else if (event === 'Pollution Spike') {
             forceEnv(envRef.current.temperature, envRef.current.moisture, 90);
             setHintMsg("Pollution increased! Mutation rates skyrocketed. Resistance genes (C, M, W) are needed.");
          } else if (event === 'Rising Water Level') {
             setHintMsg("Water level rising! Island shrinking. Population density is dangerously tight.");
          } else if (event === 'Overpopulation') {
             setHintMsg("Overpopulation detected! Resources scarce. Weak organisms will die rapidly.");
          }

          // End crisis
          setTimeout(() => {
              setCrisisActive(null);
              setAlertMsg("");
              setHintMsg("Crisis averted. Stabilizing ecosystem...");
              forceEnv(50, 50, 10);
          }, 20000); // Crisis lasts 20 seconds

      }, 45000); // Every 45 seconds

      return () => clearInterval(c);
  }, []);

  if (!simState) return <div className="p-10 text-center animate-pulse"><div className="w-8 h-8 mx-auto border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-emerald-500">Initializing Darwin Simulator...</p></div>;

  const { generation = 0, population_size = 0, environment = {temperature:50, moisture:50, pollution:10}, sample_organisms = [], history = [] } = simState;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-4 bg-slate-950 p-6 rounded-2xl border border-slate-800 text-slate-300">
      
      {/* Top Banner & Notifications */}
      <div className="flex flex-col gap-3">
         <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
            <div>
               <h2 className="text-xl font-black text-white flex items-center gap-2"><span className="text-emerald-500">🌍</span> Darwin Mode: Bio-Sphere Simulation</h2>
               <p className="text-slate-400 text-xs font-semibold mt-1">Real-time Molecular Evolution & Extinction Simulator</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="text-center">
                  <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Generations</span>
                  <span className="text-2xl font-black text-blue-400">{generation}</span>
               </div>
               <div className="text-center">
                  <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Population</span>
                  <span className="text-2xl font-black text-rose-500">{population_size}</span>
               </div>
               <div className="flex gap-2">
                   <button onClick={()=>setAutoEvolve(!autoEvolve)} className={`px-4 py-2 font-bold text-xs rounded-lg shadow-md transition ${autoEvolve ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>
                      {autoEvolve ? '⏸ Pause Auto-Evolve' : '▶ Start Realtime Evolve'}
                   </button>
                   <button onClick={simulateGen} className="px-4 py-2 bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition">
                      +1 Gen
                   </button>
                   <button onClick={initSim} className="px-4 py-2 bg-red-900/50 border border-red-800 text-red-300 text-xs font-bold rounded-lg hover:bg-red-900 transition">
                      Reset
                   </button>
               </div>
            </div>
         </div>
         
         {/* Hint / Alert Box */}
         <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${alertMsg ? 'bg-red-950/80 border-red-900 text-red-200' : 'bg-slate-900 border-slate-700 text-sky-300'}`}>
             <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center shrink-0">💡</div>
             <div className="flex-1">
                 {alertMsg && <div className="text-xs font-black text-red-400 mb-0.5 tracking-wider">{alertMsg}</div>}
                 <div className="text-xs font-medium">{hintMsg}</div>
             </div>
         </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid lg:grid-cols-12 gap-4">
        
        {/* LEFT: Controls & Genetics */}
        <div className="lg:col-span-3 space-y-4">
            <Card title="Environment Controls">
               <div className="space-y-4">
                   <div>
                       <div className="flex justify-between text-[11px] mb-1 font-bold text-slate-400"><span>Temperature</span><span className="text-rose-400">{environment.temperature}°C</span></div>
                       <input type="range" min="0" max="100" value={environment.temperature} onChange={e => updateEnv('temperature', e.target.value)} className="w-full accent-rose-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none" />
                   </div>
                   <div>
                       <div className="flex justify-between text-[11px] mb-1 font-bold text-slate-400"><span>Moisture</span><span className="text-sky-400">{environment.moisture}%</span></div>
                       <input type="range" min="0" max="100" value={environment.moisture} onChange={e => updateEnv('moisture', e.target.value)} className="w-full accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none" />
                   </div>
                   <div>
                       <div className="flex justify-between text-[11px] mb-1 font-bold text-slate-400"><span>Pollution Toxin</span><span className="text-amber-400">{environment.pollution} ppm</span></div>
                       <input type="range" min="0" max="100" value={environment.pollution} onChange={e => updateEnv('pollution', e.target.value)} className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none" />
                   </div>
               </div>
            </Card>

            <Card title="Genetic Mutator">
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 mb-4">
                  {(!sample_organisms || sample_organisms.length === 0) ? (
                      <div className="text-xs text-red-500 bg-red-950 p-2 rounded">EXTINCTION</div>
                  ) : (
                      sample_organisms.map((org, i) => (
                          <button key={i} onClick={()=>setSelectedOrgIdx(i)}
                                  className={`w-full text-left p-2 rounded-lg border text-[11px] transition ${i === selectedOrgIdx ? 'bg-slate-700/50 border-emerald-500/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                              <span className={i === selectedOrgIdx ? 'text-white font-bold' : 'text-slate-400'}>Specimen #{i+1}</span>
                          </button>
                      ))
                  )}
                </div>

                {sample_organisms[selectedOrgIdx] && (
                    <div className="relative pt-2 border-t border-slate-700">
                        <div className="text-[10px] text-slate-400 mb-2 uppercase tracking-wide">Base Pair Editor</div>
                        <div className="flex flex-wrap gap-1">
                          {sample_organisms[selectedOrgIdx].dna.split('').map((base, idx) => (
                             <div key={idx} className="group relative">
                                <div className={`w-5 h-5 flex items-center justify-center font-mono font-bold text-[10px] rounded cursor-pointer transition
                                      ${base==='A'?'bg-red-900/40 text-red-400':base==='T'?'bg-blue-900/40 text-blue-400':base==='G'?'bg-emerald-900/40 text-emerald-400':'bg-amber-900/40 text-amber-400'}`}>
                                      {base}
                                </div>
                                <div className="absolute hidden group-hover:flex flex-col bg-slate-900 rounded border border-slate-700 shadow-xl z-20 bottom-full mb-1">
                                    {['A','T','G','C'].map(b => (
                                       <button key={b} onClick={()=>mutateDna(idx, b)} className="px-2 py-1 text-white text-[10px] hover:bg-slate-700 font-mono">{b}</button>
                                    ))}
                                </div>
                             </div>
                          ))}
                        </div>
                    </div>
                )}
            </Card>
        </div>

        {/* CENTER: 2D Canvas Island */}
        <div className="lg:col-span-6 flex flex-col">
            <div className="flex-1 bg-black rounded-xl border-2 border-slate-800 shadow-2xl overflow-hidden relative min-h-[400px]">
                {/* Visual Canvas Overlay/Scanlines */}
                <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMSkiLz48L3N2Zz4=')] opacity-50 z-10"></div>
                
                <canvas ref={canvasRef} width={600} height={500} className="w-full h-full object-cover" />
                
                {/* Canvas Status Hud */}
                <div className="absolute top-4 left-4 z-20 pt-1 pl-2 border-l-2 border-emerald-500 bg-black/40 backdrop-blur-sm rounded-r-md px-3 py-1">
                     <span className="text-[10px] font-mono text-emerald-400 block tracking-widest">ECOSYSTEM MATRIX</span>
                     <span className="text-[9px] text-slate-300">Live Render | Scale: Continental</span>
                </div>

                <div className="absolute bottom-4 left-4 z-20 flex gap-2">
                    <div className="flex items-center gap-1 text-[9px] bg-black/60 px-2 py-1 rounded text-white"><span className="w-2 h-2 rounded-full bg-[#4ade80]"></span> High Fit</div>
                    <div className="flex items-center gap-1 text-[9px] bg-black/60 px-2 py-1 rounded text-white"><span className="w-2 h-2 rounded-full bg-[#facc15]"></span> Med Fit</div>
                    <div className="flex items-center gap-1 text-[9px] bg-black/60 px-2 py-1 rounded text-white"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> Low Fit</div>
                </div>

                {crisisActive && (
                    <div className="absolute inset-0 z-10 border-4 border-red-500/50 animate-pulse pointer-events-none rounded-xl"></div>
                )}
            </div>
        </div>

        {/* RIGHT: Analytics & Details */}
        <div className="lg:col-span-3 space-y-4">
            <Card title="Population History">
                <LineChart history={history} />
            </Card>

            <Card className="flex-1" title="Organism Telemetry">
                 {sample_organisms[selectedOrgIdx] ? (
                     <div className="space-y-4">
                         <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Protein Chain</div>
                            <pre className="mt-1 bg-slate-950 text-sky-300 p-2 rounded border border-slate-800 text-[10px] font-mono whitespace-pre-wrap word-break">
                               {sample_organisms[selectedOrgIdx].traits.protein || "N/A"}
                            </pre>
                         </div>
                         <div className="grid grid-cols-1 gap-2">
                            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex justify-between"><span>Stability</span> <span className="text-rose-400">{sample_organisms[selectedOrgIdx].traits.stability.toFixed(1)}</span></div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full"><div className="bg-rose-500 h-1.5 rounded-full" style={{width: `${Math.min(100, sample_organisms[selectedOrgIdx].traits.stability*5)}%`}}></div></div>
                            </div>
                            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex justify-between"><span>Metabolism</span> <span className="text-sky-400">{sample_organisms[selectedOrgIdx].traits.metabolism.toFixed(1)}</span></div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full"><div className="bg-sky-500 h-1.5 rounded-full" style={{width: `${Math.min(100, sample_organisms[selectedOrgIdx].traits.metabolism*5)}%`}}></div></div>
                            </div>
                            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex justify-between"><span>Toxin Resistance</span> <span className="text-amber-400">{sample_organisms[selectedOrgIdx].traits.resistance.toFixed(1)}</span></div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, sample_organisms[selectedOrgIdx].traits.resistance*5)}%`}}></div></div>
                            </div>
                         </div>
                     </div>
                 ) : <div className="text-[10px] text-slate-500 py-4 text-center">No Data</div>}
            </Card>
        </div>

      </div>
    </div>
  );
}
