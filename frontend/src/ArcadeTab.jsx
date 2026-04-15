import React, { useEffect, useRef, useState } from 'react';

const Card = ({ title, children, className="" }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
    <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3 font-semibold text-slate-800 flex items-center gap-2">
      {title}
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
);

export default function ArcadeTab() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [hiScore, setHiScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  
  const stateRef = useRef({
    active: false, paused: false, score: 0, lives: 3, wave: 1, hiScore: 0, 
    mouseX: 300, strands: [], bullets: [], particles: [], shards: [], popups: [],
    spawnTimer: 0, spawnInterval: 90, frameCount: 0, gameOver: false, started: false
  });

  const animIdRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 600, H = 520, GUN_Y = H - 50, GUN_W = 60, GUN_H = 34;
    const BASE_COLORS = { A: '#dc2626', T: '#2563eb', G: '#059669', C: '#d97706', '*': '#7c3aed' };
    const BASE_POINTS = { A: 10, T: 10, G: 15, C: 15, '*': 25 };

    const drawIdle = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H); // Dark sci-fi theme
      
      // Cyber grid background
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)'; ctx.lineWidth = 1;
      for (let x=0; x<W; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y=0; y<H; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 30px "Arial", sans-serif'; ctx.textAlign = 'center';
      ctx.shadowBlur = 10; ctx.shadowColor = '#38bdf8';
      ctx.fillText('🧬 Nuclease Shooter: Overdrive', W/2, H/2 - 40);
      ctx.shadowBlur = 0;
      
      ctx.font = '16px "Arial", sans-serif'; ctx.fillStyle = '#94a3b8';
      ctx.fillText('Shatter Double Helixes & Collect DNA Fragments!', W/2, H/2 + 10);
      ctx.font = '13px "Arial", sans-serif';
      ctx.fillText('Small Core = +5 | Large Strand = +10', W/2, H/2 + 38);
      drawGun(W/2);
    };

    const drawGun = (x) => {
      const gx = x - GUN_W/2, gy = GUN_Y;
      ctx.save();
      // Gun Base Shadow
      ctx.shadowColor = '#0ea5e9'; ctx.shadowBlur = 15;
      
      // Collector Bucket
      ctx.fillStyle = '#1e293b'; 
      ctx.beginPath(); ctx.roundRect(gx, gy, GUN_W, GUN_H, 8); ctx.fill();
      
      // Inner blue glow (Energy)
      ctx.fillStyle = '#0ea5e9'; 
      ctx.beginPath(); ctx.roundRect(gx + 4, gy + 4, GUN_W - 8, GUN_H - 8, 4); ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Nano Barrel
      ctx.fillStyle = '#94a3b8'; 
      ctx.beginPath(); ctx.roundRect(x - 5, gy - 20, 10, 24, 3); ctx.fill();
      
      // Laser core
      ctx.beginPath(); ctx.arc(x, gy - 6, 12, 0, Math.PI*2); ctx.fillStyle = 'white'; ctx.fill();
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.stroke();
      
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText('✂', x, gy - 2);
      ctx.restore();
    };

    const drawDoubleHelix = (strand, frameCount) => {
        const rungHeight = 16, amplitude = 22, phaseSpeed = 0.08;
        ctx.globalAlpha = strand.opacity;
        
        strand.seq.forEach((base, i) => {
             const by = strand.y + i * rungHeight;
             // Rotate based on both time and vertical rung index
             const angle = (frameCount * phaseSpeed) + (i * 0.45);
             const xOff = Math.sin(angle) * amplitude;
             const scale = (Math.cos(angle) + 1) / 2; // depth perception 0 to 1
             
             const leftX = strand.x - xOff;
             const rightX = strand.x + xOff;
             const color = BASE_COLORS[base] || '#888';
             
             // Draw Base pair connection
             ctx.beginPath();
             ctx.moveTo(leftX, by);
             ctx.lineTo(rightX, by);
             ctx.strokeStyle = color;
             ctx.lineWidth = 2.5 + (scale * 1.5);
             ctx.stroke();
             
             // Backbone Phosphates
             ctx.beginPath(); ctx.arc(leftX, by, 3 + scale*2, 0, Math.PI*2); ctx.fillStyle = '#cbd5e1'; ctx.fill();
             ctx.beginPath(); ctx.arc(rightX, by, 3 + (1-scale)*2, 0, Math.PI*2); ctx.fillStyle = '#64748b'; ctx.fill();
        });
        ctx.globalAlpha = 1;
    };

    const spawnStrand = () => {
      const bases = ['A','T','G','C'];
      const len = 6 + Math.floor(Math.random()*4);
      const seq = Array.from({length: len}, () => Math.random() < 0.1 ? '*' : bases[Math.floor(Math.random()*4)]);
      const x = 50 + Math.random() * (W - 100);
      const speed = 0.8 + stateRef.current.wave * 0.25 + Math.random() * 0.5;
      stateRef.current.strands.push({ x, y: -40, seq, speed, hit: false, opacity: 1 });
    };

    const popPopupText = (x, y, txt, color) => {
      stateRef.current.popups.push({ x, y, txt, color, life: 1.0, dy: -1.5 });
    };

    const drawPopups = () => {
       stateRef.current.popups = stateRef.current.popups.filter(p => {
           p.y += p.dy;
           p.life -= 0.025;
           if (p.life <= 0) return false;
           ctx.save();
           ctx.globalAlpha = p.life;
           ctx.fillStyle = p.color;
           ctx.font = 'bold 16px "Arial", sans-serif';
           ctx.shadowColor = p.color; ctx.shadowBlur = 8;
           ctx.fillText(p.txt, p.x, p.y);
           ctx.restore();
           return true;
       });
    };

    const shatterHelix = (strandX, strandY, seqArray) => {
       // Explode entire sequence into floating physical shards
       seqArray.forEach((base, i) => {
           const by = strandY + i * 16;
           const numBits = 2 + Math.floor(Math.random() * 2);
           for(let j=0; j<numBits; j++) {
               const isLarge = Math.random() > 0.4;
               stateRef.current.shards.push({
                   x: strandX + (Math.random()-0.5)*30,
                   y: by + (Math.random()-0.5)*10,
                   vx: (Math.random()-0.5) * 6,
                   vy: (Math.random()-0.5) * 4 - 3, // arc upward
                   rv: (Math.random()-0.5) * 0.4,
                   rot: 0,
                   size: isLarge ? 8 : 4,
                   type: isLarge ? 'large' : 'small',
                   color: BASE_COLORS[base] || '#38bdf8'
               });
           }
       });
    };

    const drawShards = () => {
       const st = stateRef.current;
       st.shards = st.shards.filter(shard => {
           shard.vy += 0.2; // gravity drop
           shard.x += shard.vx;
           shard.y += shard.vy;
           shard.rot += shard.rv;

           // Check Gun Collector Collision
           if (shard.y >= GUN_Y - 20 && shard.y <= GUN_Y + GUN_H) {
               if (Math.abs(shard.x - st.mouseX) < GUN_W/2 + 15) { // Magnetic catch zone
                   const pts = shard.type === 'large' ? 10 : 5;
                   st.score += pts; setScore(st.score);
                   popPopupText(shard.x, shard.y, `+${pts}`, '#34d399'); // Emerald
                   return false; // Destroy shard
               }
           }
           
           if (shard.y > H + 30) return false; // Floor exit
           
           // Draw Shard Core
           ctx.save();
           ctx.translate(shard.x, shard.y);
           ctx.rotate(shard.rot);
           ctx.fillStyle = shard.color;
           ctx.shadowColor = shard.color; ctx.shadowBlur = Math.random()*8;
           if (shard.type === 'large') {
               ctx.fillRect(-shard.size/2, -shard.size/2, shard.size, shard.size*1.5);
           } else {
               ctx.beginPath(); ctx.arc(0, 0, shard.size, 0, Math.PI*2); ctx.fill();
           }
           ctx.restore();
           return true;
       });
    };

    const drawBullet = (b) => {
      ctx.save(); ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#bae6fd'; 
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 4, 12, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    };

    const spawnParticles = (x, y, color) => {
      for (let i=0; i<15; i++) {
        const angle = Math.random()*Math.PI*2, speed = 2 + Math.random()*4;
        stateRef.current.particles.push({x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 2, color, life: 1, size: 2+Math.random()*3});
      }
    };
    
    const drawParticle = (p) => { 
        ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; 
        ctx.shadowColor = p.color; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); 
        ctx.restore();
    };

    const drawBackground = () => {
      ctx.fillStyle = '#020617'; ctx.fillRect(0,0,W,H); // deep night sci-fi
      ctx.strokeStyle = 'rgba(56,189,248,0.06)'; ctx.lineWidth = 1;
      for (let x=0; x<W; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y=0; y<H; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      
      // Danger Collector Grid Line
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(0, GUN_Y - 20); ctx.lineTo(W, GUN_Y - 20); ctx.stroke();
      ctx.globalAlpha = 1;
      
      ctx.fillStyle = 'rgba(239,68,68,0.5)'; ctx.font = '10px Arial'; ctx.textAlign='left'; 
      ctx.fillText('COLLECTOR FLOOR / MUTATION LINE', 8, GUN_Y - 24);
    };

    const drawGameOver = () => {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 38px Arial'; ctx.textAlign='center'; ctx.fillText('System Failure', W/2, H/2 - 50);
      ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 22px Arial'; ctx.fillText(`Total Resources: ${stateRef.current.score}`, W/2, H/2 - 10);
      ctx.fillStyle = '#94a3b8'; ctx.font = '15px Arial'; ctx.fillText('Click Restart to initiate clean phase', W/2, H/2 + 40);
    };

    const gameLoop = () => {
      const st = stateRef.current;
      if (!st.active || st.paused || st.gameOver) {
        if (st.gameOver) drawGameOver();
        return;
      }
      ctx.clearRect(0,0,W,H); drawBackground(); st.frameCount++;
      
      st.spawnTimer++; const interval = Math.max(35, st.spawnInterval - st.wave * 4);
      if (st.spawnTimer >= interval) { spawnStrand(); st.spawnTimer = 0; }

      if (st.score > 0 && st.score >= st.wave * 300) {
        st.wave++; setWave(st.wave);
        popPopupText(W/2, H/2, `WAVE ${st.wave} UNLOCKED`, '#fcd34d');
      }

      // Physics: Strands (Helixes)
      st.strands = st.strands.filter(s => {
        if (s.hit) return false; // Immediate removal upon hit
        s.y += s.speed; 
        const bottom = s.y + s.seq.length * 16;
        
        if (bottom >= GUN_Y - 10) {
            st.lives--; s.hit = true; setLives(Math.max(0, st.lives));
            if (st.lives <= 0) {
                st.gameOver = true;
                if (st.score > st.hiScore) { st.hiScore = st.score; setHiScore(st.score); }
                return false;
            }
            return false;
        }
        drawDoubleHelix(s, st.frameCount); return true;
      });

      // Physics: Bullets vs Helixes
      st.bullets = st.bullets.filter(b => {
        b.y -= 14; if (b.y < -10) return false;
        let hit = false;
        
        st.strands.forEach(s => {
            if (hit || s.hit) return;
            // Helix collision boundary
            const hLength = s.seq.length * 16;
            if (b.y > s.y && b.y < s.y + hLength && Math.abs(b.x - s.x) < 25) {
                // Hit the helix!
                const base = s.seq[0];
                st.score += BASE_POINTS[base]||10; setScore(st.score);
                spawnParticles(b.x, b.y, '#38bdf8');
                popPopupText(s.x, s.y, "CRITICAL SHATTER!", '#f43f5e');
                
                // Explode entire helix into shards
                shatterHelix(s.x, s.y, s.seq);
                
                s.hit = true; // Mark dead
                hit = true;
            }
        });
        
        if (!hit) drawBullet(b); 
        return !hit;
      });

      // Shards Rendering
      drawShards();

      // Particles
      st.particles = st.particles.filter(p => {
          p.x+=p.vx; p.y+=p.vy; p.vy+=0.1; p.life-=0.035;
          if (p.life<=0) return false;
          drawParticle(p); return true;
      });

      // Popups
      drawPopups();

      drawGun(st.mouseX);
      animIdRef.current = requestAnimationFrame(gameLoop);
    };

    const handleMouseMove = (e) => {
        const rect = canvas.getBoundingClientRect(); const scaleX = W / rect.width;
        stateRef.current.mouseX = Math.max(GUN_W/2, Math.min(W - GUN_W/2, (e.clientX - rect.left)*scaleX));
    };
    const handleClick = (e) => {
        const st = stateRef.current;
        if (!st.active || st.paused || st.gameOver) return;
        st.bullets.push({ x: st.mouseX, y: GUN_Y - 24 });
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    window.StartArcade = () => {
        if(stateRef.current.gameOver) return;
        stateRef.current.active = true; stateRef.current.paused = false; stateRef.current.started = true;
        setStarted(true); setPaused(false);
        gameLoop();
    };
    window.PauseArcade = () => {
        if(!stateRef.current.active) return;
        stateRef.current.paused = !stateRef.current.paused;
        setPaused(stateRef.current.paused);
        if(!stateRef.current.paused) gameLoop();
    };
    window.ResetArcade = () => {
        if(animIdRef.current) cancelAnimationFrame(animIdRef.current);
        stateRef.current = {
            active: false, paused: false, score: 0, lives: 3, wave: 1, hiScore: stateRef.current.hiScore, 
            mouseX: W/2, strands: [], bullets: [], particles: [], shards: [], popups: [],
            spawnTimer: 0, spawnInterval: 90, frameCount: 0, gameOver: false, started: false
        };
        setScore(0); setLives(3); setWave(1); setStarted(false); setPaused(false);
        drawIdle();
    };

    drawIdle();

    return () => {
        if(animIdRef.current) cancelAnimationFrame(animIdRef.current);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
            <Card title="Nuclease Shooter: Overdrive">
                <canvas ref={canvasRef} width={600} height={520} className="rounded-lg shadow-xl w-full border border-slate-700 bg-slate-900" />
                <div className="flex gap-4 mt-4">
                    <button className="flex-1 bg-sky-600 font-semibold py-3 text-white rounded-lg hover:bg-sky-500 transition shadow-md shadow-sky-500/20" onClick={()=>window.StartArcade()}>{started ? (paused ? 'Resume Mission' : 'System Active') : 'Initialize Game Phase'}</button>
                    <button className="flex-1 bg-amber-500 font-semibold py-3 text-slate-900 rounded-lg hover:bg-amber-400 transition shadow-md" onClick={()=>window.PauseArcade()}>Halt Target</button>
                    <button className="flex-1 bg-rose-600 font-semibold py-3 text-white rounded-lg hover:bg-rose-500 transition shadow-md" onClick={()=>window.ResetArcade()}>Reboot Subsystem</button>
                </div>
            </Card>
        </div>
        <div className="lg:col-span-4 space-y-4">
            <Card title="Player HUD">
                <div className="space-y-4 text-center">
                   <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-1 bg-sky-500"></div>
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Total Gathered Resource Points</span>
                       <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">{score}</span>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 border border-red-200 p-4 rounded-xl shadow-inner">
                           <span className="text-xs font-bold text-rose-500 uppercase tracking-widest block mb-1">Defense Cores</span>
                           <span className="text-2xl font-bold">{'❤️'.repeat(lives)}{lives===0?'💀':''}</span>
                       </div>
                       <div className="bg-slate-50 border border-amber-200 p-4 rounded-xl shadow-inner">
                           <span className="text-xs font-bold text-amber-600 uppercase tracking-widest block mb-1">Assault Wave</span>
                           <span className="text-2xl font-black text-amber-500">{wave}</span>
                       </div>
                   </div>
                   <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-4">Max Peak Orbit: <span className="text-slate-800 text-lg ml-1 font-black">{hiScore}</span></div>
                </div>
            </Card>
            <Card title="Operational Directives">
                <div className="space-y-3 text-sm font-semibold text-slate-600 mb-4">
                    <p className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border">
                        <span className="text-sky-600 mt-0.5">💥</span> 
                        <span>Shoot falling <strong className="text-slate-800">Double Helixes</strong> to shatter them into independent DNA fragments.</span>
                    </p>
                    <p className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border">
                        <span className="text-emerald-600 mt-0.5">🧲</span> 
                        <span>Slide your Collector Gun left/right to <strong className="text-slate-800">CATCH falling Fragments</strong>.</span>
                    </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs font-medium bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <div className="flex flex-col items-center p-2"><span className="w-5 h-5 bg-sky-500 rounded-full mb-1"></span> <strong className="text-slate-800">Small Shard</strong> +5 Pts</div>
                    <div className="flex flex-col items-center p-2"><span className="w-5 h-8 bg-rose-500 rounded-sm mb-1"></span> <strong className="text-slate-800">Large Shard</strong> +10 Pts</div>
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}
