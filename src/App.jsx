import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, Home, Trash2, LayoutDashboard, Database, 
  Zap, Calendar, BarChart3, LogIn, LogOut, 
  TrendingUp, Activity, ArrowDownLeft, ArrowUpRight,
  ShieldCheck, MousePointerClick, RefreshCcw
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell 
} from 'recharts';

/**
 * CORE LOGIC:
 * 1. Consumption = (Produced - Exported) + Imported
 * 2. Self-Consumption = Produced - Exported
 * 3. Solar Efficiency = (Self-Consumption / Produced) * 100
 */

const getEnv = (key) => {
  try {
    if (typeof window !== 'undefined' && window[key]) return window[key];
    if (import.meta.env && import.meta.env[key]) return import.meta.env[key];
  } catch (e) { return ''; }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL'); 
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

export default function App() {
  const [supabase, setSupabase] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('month'); 
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [solarData, setSolarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminAuth, setAdminAuth] = useState(false);
  const [password, setPassword] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    produced: '',
    exported: '',
    imported: ''
  });

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = () => {
      if (window.supabase && supabaseUrl && supabaseAnonKey) {
        setSupabase(window.supabase.createClient(supabaseUrl, supabaseAnonKey));
      } else { setLoading(false); }
    };
    document.body.appendChild(script);
  }, []);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from('daily_readings').select('*').order('date', { ascending: true });
    if (!error) setSolarData(data || []);
    setLoading(false);
  };

  useEffect(() => { if (supabase) fetchData(); }, [supabase]);

  const processedData = useMemo(() => {
    return solarData.map(d => {
      const prod = Number(d.produced || 0);
      const exp = Number(d.exported || 0);
      const imp = Number(d.imported || 0);
      const self = prod - exp;
      return { 
        ...d, 
        consumed: self + imp, 
        selfUsed: self,
        efficiency: prod > 0 ? (self / prod) * 100 : 0
      };
    });
  }, [solarData]);

  const currentPeriodData = useMemo(() => {
    if (viewMode === 'month') return processedData.filter(d => d.date.startsWith(selectedMonth));
    return processedData.filter(d => d.date.startsWith(selectedYear));
  }, [processedData, viewMode, selectedMonth, selectedYear]);

  const yearlyGraphData = useMemo(() => {
    if (viewMode !== 'year') return [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((month, index) => {
      const prefix = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
      const entries = processedData.filter(d => d.date.startsWith(prefix));
      return {
        name: month,
        produced: entries.reduce((acc, curr) => acc + curr.produced, 0),
        consumed: entries.reduce((acc, curr) => acc + curr.consumed, 0)
      };
    });
  }, [processedData, viewMode, selectedYear]);

  const stats = useMemo(() => {
    if (currentPeriodData.length === 0) return null;
    const count = currentPeriodData.length;
    const prod = currentPeriodData.reduce((acc, curr) => acc + curr.produced, 0);
    const exp = currentPeriodData.reduce((acc, curr) => acc + curr.exported, 0);
    const imp = currentPeriodData.reduce((acc, curr) => acc + curr.imported, 0);
    const cons = currentPeriodData.reduce((acc, curr) => acc + curr.consumed, 0);
    const self = prod - exp;

    return {
      totalProduced: prod.toFixed(1),
      totalConsumed: cons.toFixed(1),
      avgProduced: (prod / count).toFixed(2),
      avgConsumed: (cons / count).toFixed(2),
      exported: exp.toFixed(1),
      imported: imp.toFixed(1),
      selfUsed: self.toFixed(1),
      selfRate: prod > 0 ? ((self / prod) * 100).toFixed(0) : 0,
      gridRate: cons > 0 ? ((imp / cons) * 100).toFixed(0) : 0
    };
  }, [currentPeriodData]);

  const deleteEntry = async (id) => {
    if (!id || !adminAuth || !window.confirm("Permanent delete?")) return;
    const { error } = await supabase.from('daily_readings').delete().eq('id', id);
    if (error) alert(error.message); else fetchData();
  };

  const addEntry = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('daily_readings').insert([{
      date: formData.date,
      produced: parseFloat(formData.produced),
      exported: parseFloat(formData.exported),
      imported: parseFloat(formData.imported)
    }]);
    if (!error) {
      setFormData({ date: new Date().toISOString().split('T')[0], produced: '', exported: '', imported: '' });
      fetchData();
    }
  };

  if (loading && supabaseUrl) return (
    <div className="flex h-screen items-center justify-center bg-[#0F172A] text-white">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <Zap className="text-blue-400 w-12 h-12 animate-bounce" />
        <p className="font-bold tracking-widest text-sm opacity-50 uppercase">Syncing Grid...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* HEADER */}
      <nav className="border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-xl h-20 flex items-center px-8 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Zap className="text-white w-6 h-6" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">SOLAR<span className="text-blue-500">PRO</span></h1>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
              <Activity size={10} className="text-emerald-500"/> System Active
            </div>
          </div>
        </div>

        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5">
          <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ANALYTICS</button>
          <button onClick={() => setActiveTab('admin')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'admin' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>STORAGE</button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Performance Summary</h2>
                <p className="text-slate-500 text-sm font-medium">Real-time telemetry and consumption metrics</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-900/80 p-2 rounded-2xl border border-white/5">
                <div className="flex bg-black/40 p-1 rounded-xl">
                  {['month', 'year'].map(m => (
                    <button key={m} onClick={() => setViewMode(m)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === m ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-600 hover:text-slate-400'}`}>{m}</button>
                  ))}
                </div>
                {viewMode === 'month' ? (
                  <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-white font-bold outline-none text-xs px-2 cursor-pointer" />
                ) : (
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-white font-bold outline-none text-xs px-2 cursor-pointer">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* MAIN STAT CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <InsightCard 
                title="Solar Harvest" 
                total={stats?.totalProduced} 
                avg={stats?.avgProduced} 
                icon={<Sun className="text-amber-400" />}
                color="from-amber-500/20 to-orange-500/5"
                accent="#f59e0b"
                details={[
                  { label: "House Usage", val: stats?.selfUsed, p: stats?.selfRate, c: "#f59e0b" },
                  { label: "Grid Feed-in", val: stats?.exported, p: 100-stats?.selfRate, c: "#334155" }
                ]}
              />
              <InsightCard 
                title="House Demand" 
                total={stats?.totalConsumed} 
                avg={stats?.avgConsumed} 
                icon={<Home className="text-blue-400" />}
                color="from-blue-500/20 to-indigo-500/5"
                accent="#3b82f6"
                details={[
                  { label: "Solar Powered", val: stats?.selfUsed, p: 100-stats?.gridRate, c: "#60a5fa" },
                  { label: "Imported to Home", val: stats?.imported, p: stats?.gridRate, c: "#1e1b4b" }
                ]}
              />
            </div>

            {/* VISUALIZATION GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* MAIN CHART */}
              <div className="xl:col-span-2 bg-slate-900/40 rounded-[32px] p-8 border border-white/5 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold flex items-center gap-2 text-slate-400 uppercase text-xs tracking-widest"><TrendingUp size={16} className="text-blue-500" /> Power Flow History</h3>
                  <div className="flex gap-4 text-[10px] font-bold uppercase">
                    <span className="flex items-center gap-1.5 text-amber-500"><div className="w-2 h-2 rounded-full bg-amber-500"/> Solar</span>
                    <span className="flex items-center gap-1.5 text-blue-500"><div className="w-2 h-2 rounded-full bg-blue-500"/> Load</span>
                  </div>
                </div>
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {viewMode === 'year' ? (
                      <BarChart data={yearlyGraphData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}} />
                        <Bar dataKey="produced" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Solar" />
                        <Bar dataKey="consumed" fill="#3b82f6" radius={[6, 6, 0, 0]} name="House" />
                      </BarChart>
                    ) : (
                      <AreaChart data={currentPeriodData}>
                        <defs>
                          <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.split('-').pop()} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}} />
                        <Area type="monotone" dataKey="produced" stroke="#f59e0b" strokeWidth={3} fill="url(#colorSolar)" name="Solar" />
                        <Area type="monotone" dataKey="consumed" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 6" fill="transparent" name="House" />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* QUICK INTELLIGENCE */}
              <div className="bg-slate-900/40 rounded-[32px] p-8 border border-white/5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-8">System Intelligence</h3>
                  <div className="space-y-6">
                    <MiniStat label="Solar Efficiency" val={`${stats?.selfRate}%`} sub="Usage vs Production" icon={<TrendingUp size={14}/>} color="text-amber-500" />
                    <MiniStat label="Grid Independence" val={`${100-stats?.gridRate}%`} sub="Self-Sustaining Level" icon={<ShieldCheck size={14}/>} color="text-blue-500" />
                    <MiniStat label="Avg. Daily Cost Save" val={`$${(stats?.avgProduced * 0.15).toFixed(2)}`} sub="Estimated Savings" icon={<RefreshCcw size={14}/>} color="text-emerald-500" />
                  </div>
                </div>
                <div className="pt-8 border-t border-white/5 mt-8">
                  <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-center">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total System Offset</p>
                    <p className="text-2xl font-black text-white">{stats?.totalProduced} kWh</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {!adminAuth ? (
              <div className="bg-slate-900/60 p-12 rounded-[40px] border border-white/5 shadow-2xl max-w-md mx-auto mt-20 text-center backdrop-blur-xl">
                <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
                  <LogIn className="text-blue-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Access Control</h2>
                <p className="text-slate-500 text-sm mb-8 font-medium">Verify credentials to edit energy records</p>
                <input type="password" placeholder="System Key" className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 mb-4 outline-none focus:ring-2 ring-blue-500 transition-all text-center font-bold tracking-[0.5em]" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => password === 'admin123' ? setAdminAuth(true) : alert('Invalid')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-900/20">AUTHENTICATE</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-slate-900/40 p-8 rounded-[32px] border border-white/5 shadow-sm h-fit">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400">Add Log</h3>
                    <button onClick={() => setAdminAuth(false)} className="text-[10px] font-black text-red-400 hover:text-red-300 transition-all uppercase tracking-widest">Logout</button>
                  </div>
                  <form onSubmit={addEntry} className="space-y-6">
                    <InputGroup label="Reading Date" type="date" val={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                    <InputGroup label="Solar Produced (kWh)" type="number" val={formData.produced} onChange={(e) => setFormData({...formData, produced: e.target.value})} />
                    <InputGroup label="Exported to Grid (kWh)" type="number" val={formData.exported} onChange={(e) => setFormData({...formData, exported: e.target.value})} />
                    <InputGroup label="Imported to Home (kWh)" type="number" val={formData.imported} onChange={(e) => setFormData({...formData, imported: e.target.value})} />
                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 mt-4">
                      <MousePointerClick size={16}/> SAVE TELEMETRY
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-2 bg-slate-900/40 rounded-[32px] border border-white/5 shadow-sm overflow-hidden flex flex-col h-[700px]">
                  <div className="p-6 border-b border-white/5 bg-black/20 font-black text-[10px] uppercase tracking-widest text-slate-500">Historical Database</div>
                  <div className="overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-black/20 text-slate-500 text-[10px] font-black uppercase tracking-tighter sticky top-0">
                        <tr><th className="p-5 text-left">Timestamp</th><th className="p-5 text-right">Solar</th><th className="p-5 text-right">Export</th><th className="p-5 text-right">Import</th><th className="p-5"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {solarData.slice().reverse().map(e => (
                          <tr key={e.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-5 font-bold text-slate-300">{e.date}</td>
                            <td className="p-5 text-right text-amber-500 font-black">{e.produced}</td>
                            <td className="p-5 text-right text-slate-500 font-medium">{e.exported}</td>
                            <td className="p-5 text-right text-blue-400 font-black">{e.imported}</td>
                            <td className="p-5 text-center">
                              <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 p-2 transition-all">
                                <Trash2 size={16}/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// UI COMPONENTS
function InsightCard({ title, total, avg, icon, color, accent, details }) {
  return (
    <div className={`bg-gradient-to-br ${color} p-8 rounded-[40px] border border-white/5 shadow-2xl flex flex-col md:flex-row items-center gap-12 group transition-all`}>
      <div className="relative">
        <div className="w-32 h-32 rounded-full border-[10px] border-black/20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-black text-white">{total || '0'}</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total kWh</p>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full rounded-full border-[10px] border-transparent transition-all duration-1000" style={{ borderTopColor: accent, transform: 'rotate(45deg)' }}></div>
      </div>
      <div className="flex-1 w-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/40 rounded-xl">{icon}</div>
            <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase">Avg / Day</p>
            <p className="text-sm font-black text-white">{avg || '0'} kWh</p>
          </div>
        </div>
        <div className="space-y-5">
          {details.map((item, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                <span className="text-slate-400">{item.label}</span>
                <span className="text-white">{item.val} kWh <span className="text-slate-500 ml-1">({item.p}%)</span></span>
              </div>
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.p}%`, backgroundColor: item.c }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, val, sub, icon, color }) {
  return (
    <div className="flex items-start gap-4">
      <div className={`p-2 bg-black/40 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-black text-white leading-none mt-1">{val}</p>
        <p className="text-[9px] font-medium text-slate-600 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function InputGroup({ label, type, val, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type} 
        step="0.01" 
        value={val} 
        onChange={onChange} 
        required 
        className="w-full p-4 bg-black/40 border border-white/5 rounded-2xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all" 
      />
    </div>
  );
}