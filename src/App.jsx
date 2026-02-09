import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, Home, Trash2, LayoutDashboard, Database, 
  Zap, Calendar, BarChart3, LogIn, LogOut, 
  TrendingUp, Activity, ArrowDownLeft, ArrowUpRight,
  ShieldCheck, MousePointerClick, RefreshCcw, Search, Info
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

/**
 * CORE LOGIC:
 * 1. Consumption = (Produced - Exported) + Imported
 * 2. Self-Consumption = Produced - Exported
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
  const [viewMode, setViewMode] = useState('day'); // Options: 'day', 'month', 'year'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Dynamic Filtering
  const currentPeriodData = useMemo(() => {
    if (viewMode === 'day') return processedData.filter(d => d.date === selectedDate);
    if (viewMode === 'month') return processedData.filter(d => d.date.startsWith(selectedMonth));
    return processedData.filter(d => d.date.startsWith(selectedYear));
  }, [processedData, viewMode, selectedDate, selectedMonth, selectedYear]);

  // Aggregation for Year View
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
    if (!id || !adminAuth || !window.confirm("Confirm permanent removal?")) return;
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
    <div className="flex h-screen items-center justify-center bg-[#0B0F1A] text-white">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <Zap className="text-blue-500 w-16 h-16 animate-pulse" />
          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20"></div>
        </div>
        <p className="font-black text-xs tracking-[0.3em] opacity-40 uppercase">Linking Power Grid</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-300 font-sans selection:bg-blue-500/30">
      {/* NAVBAR */}
      <nav className="border-b border-white/5 bg-[#0B0F1A]/80 backdrop-blur-2xl h-20 flex items-center px-10 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40">
            <Zap className="text-white w-6 h-6" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white">SOLAR<span className="text-blue-500">PRO</span></h1>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Energy Intelligence v2.0</p>
          </div>
        </div>

        <div className="hidden md:flex bg-slate-900/40 p-1.5 rounded-2xl border border-white/5">
          {['dashboard', 'admin'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              {tab === 'dashboard' ? 'Analytics' : 'Management'}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-[1440px] mx-auto p-10">
        {activeTab === 'dashboard' ? (
          <div className="space-y-10 animate-in fade-in duration-1000">
            
            {/* ANALYSIS CONTROLS */}
            <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-8">
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-white tracking-tighter">
                  {viewMode === 'day' ? 'Daily Telemetry' : viewMode === 'month' ? 'Monthly Insight' : 'Yearly Report'}
                </h2>
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Activity size={14} className="text-emerald-500" /> System operating at peak efficiency
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-900/60 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex bg-black/40 p-1 rounded-xl">
                  {['day', 'month', 'year'].map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === mode ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-600 hover:text-slate-400'}`}>{mode}</button>
                  ))}
                </div>
                <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
                {viewMode === 'day' ? <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white font-black outline-none text-xs px-2 cursor-pointer" /> :
                 viewMode === 'month' ? <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-white font-black outline-none text-xs px-2 cursor-pointer" /> :
                 <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-white font-black outline-none text-xs px-2 cursor-pointer"><option value="2026" className="bg-slate-950">2026</option><option value="2025" className="bg-slate-950">2025</option></select>}
              </div>
            </div>

            {/* KEY METRICS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <InsightCard 
                title="Generation" 
                total={stats?.totalProduced} 
                avg={viewMode !== 'day' ? stats?.avgProduced : null}
                accent="#f59e0b"
                details={[{ label: "Direct Use", p: stats?.selfRate, c: "#f59e0b" }, { label: "Grid Feed", p: 100-stats?.selfRate, c: "#1e293b" }]}
                icon={<Sun size={20} />}
              />
              <InsightCard 
                title="Consumption" 
                total={stats?.totalConsumed} 
                avg={viewMode !== 'day' ? stats?.avgConsumed : null}
                accent="#3b82f6"
                details={[{ label: "Solar Share", p: 100-stats?.gridRate, c: "#60a5fa" }, { label: "Imported", p: stats?.gridRate, c: "#1e1b4b" }]}
                icon={<Home size={20} />}
              />
              
              {/* SMART ANALYSIS MINI PANEL */}
              <div className="bg-slate-900/40 rounded-[40px] p-8 border border-white/5 flex flex-col justify-between backdrop-blur-sm">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Live Intelligence</h3>
                  <MiniMetric label="Independence" val={`${100-stats?.gridRate}%`} icon={<ShieldCheck className="text-emerald-500"/>} />
                  <MiniMetric label="Self-Sufficiency" val={`${stats?.selfRate}%`} icon={<RefreshCcw className="text-blue-500"/>} />
                  <MiniMetric label="Export Ratio" val={stats ? `${(stats.exported / stats.totalProduced * 100).toFixed(0)}%` : '0%'} icon={<ArrowUpRight className="text-amber-500"/>} />
                </div>
                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-500 uppercase italic">Refreshed: Real-time</div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* CHART SECTION */}
            <div className="bg-slate-900/40 rounded-[48px] p-10 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full -mr-40 -mt-40"></div>
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <BarChart3 size={18} className="text-blue-500" /> Power Distribution Curve
                </h3>
                <div className="flex gap-6">
                  <LegendItem color="bg-amber-500" label="Solar Output" />
                  <LegendItem color="bg-blue-500" label="House Load" />
                </div>
              </div>
              
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'year' ? (
                    <BarChart data={yearlyGraphData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#475569'}} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#475569'}} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px'}} />
                      <Bar dataKey="produced" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={30} />
                      <Bar dataKey="consumed" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={30} />
                    </BarChart>
                  ) : (
                    <AreaChart data={currentPeriodData}>
                      <defs>
                        <linearGradient id="areaSolar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.split('-').pop()} axisLine={false} tickLine={false} tick={{fill: '#475569'}} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#475569'}} />
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px'}} />
                      <Area type="monotone" dataKey="produced" stroke="#f59e0b" strokeWidth={4} fill="url(#areaSolar)" />
                      <Area type="monotone" dataKey="consumed" stroke="#3b82f6" strokeWidth={2} strokeDasharray="8 8" fill="transparent" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10 max-w-6xl mx-auto">
            {!adminAuth ? (
              <div className="bg-slate-900/80 p-16 rounded-[56px] border border-white/5 shadow-2xl max-w-lg mx-auto mt-20 text-center backdrop-blur-3xl">
                <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20 shadow-inner">
                  <LogIn className="text-blue-500 w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-white mb-3 tracking-tighter">System Access</h2>
                <p className="text-slate-500 text-sm mb-10 font-medium">Verify administrator credentials to modify history</p>
                <div className="space-y-4">
                  <input type="password" placeholder="ENTER ACCESS KEY" className="w-full p-5 bg-black/40 rounded-2xl border border-white/10 text-center text-white font-black tracking-[0.4em] outline-none focus:ring-2 ring-blue-600 transition-all" onChange={(e) => setPassword(e.target.value)} />
                  <button onClick={() => password === 'admin123' ? setAdminAuth(true) : alert('ACCESS DENIED')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black transition-all shadow-xl shadow-blue-900/20 active:scale-95 uppercase tracking-widest text-xs">Unlock Database</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="bg-slate-900/40 p-10 rounded-[40px] border border-white/5 h-fit backdrop-blur-md">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Log Record</h3>
                    <button onClick={() => setAdminAuth(false)} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:underline">Exit</button>
                  </div>
                  <form onSubmit={addEntry} className="space-y-6">
                    <InputGroup label="Reading Date" type="date" val={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                    <InputGroup label="Produced (kWh)" type="number" val={formData.produced} onChange={(e) => setFormData({...formData, produced: e.target.value})} />
                    <InputGroup label="Exported (kWh)" type="number" val={formData.exported} onChange={(e) => setFormData({...formData, exported: e.target.value})} />
                    <InputGroup label="Imported (kWh)" type="number" val={formData.imported} onChange={(e) => setFormData({...formData, imported: e.target.value})} />
                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 text-xs uppercase tracking-widest">
                      <MousePointerClick size={16}/> Push to Cloud
                    </button>
                  </form>
                </div>
                
                <div className="lg:col-span-2 bg-slate-900/40 rounded-[40px] border border-white/5 overflow-hidden flex flex-col h-[750px] backdrop-blur-md">
                  <div className="p-6 bg-black/20 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data Ledger</span>
                    <div className="flex items-center gap-2 text-slate-600"><Database size={12}/> {solarData.length} Entries</div>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm">
                      <thead className="bg-black/20 text-slate-500 text-[10px] font-black uppercase tracking-widest sticky top-0 z-10">
                        <tr><th className="p-6 text-left">Timestamp</th><th className="p-6 text-right">Solar</th><th className="p-6 text-right">Import</th><th className="p-6 text-right">House</th><th className="p-6"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {solarData.slice().reverse().map(e => (
                          <tr key={e.id} className="hover:bg-white/[0.03] transition-colors group">
                            <td className="p-6 font-bold text-slate-400">{e.date}</td>
                            <td className="p-6 text-right text-amber-500 font-black">+{e.produced}</td>
                            <td className="p-6 text-right text-blue-500 font-black">-{e.imported}</td>
                            <td className="p-6 text-right text-slate-200 font-black">{(e.produced - e.exported + e.imported).toFixed(2)}</td>
                            <td className="p-6 text-center">
                              <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-red-500/30 hover:text-red-500 p-2 transition-all">
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

// UI HELPER COMPONENTS
function InsightCard({ title, total, avg, accent, details, icon }) {
  return (
    <div className="bg-slate-900/40 p-10 rounded-[48px] border border-white/5 shadow-2xl flex flex-col items-start gap-10 backdrop-blur-sm group hover:border-white/10 transition-all">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5 text-slate-400">{icon}</div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
        </div>
        {avg && <div className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full uppercase tracking-widest">Avg: {avg}</div>}
      </div>
      <div className="w-full space-y-8">
        <h4 className="text-6xl font-black text-white tracking-tighter">{total || '0.0'}<span className="text-xl font-medium text-slate-600 ml-3">kWh</span></h4>
        <div className="space-y-5">
          {details.map((item, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                <span className="text-slate-500">{item.label}</span>
                <span className="text-slate-300">{item.p}%</span>
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

function MiniMetric({ label, val, icon }) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="p-2 bg-black/40 rounded-xl group-hover:scale-110 transition-all">{icon}</div>
      <div>
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-black text-white">{val}</p>
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function InputGroup({ label, type, val, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{label}</label>
      <input 
        type={type} 
        step="0.01" 
        value={val} 
        onChange={onChange} 
        required 
        className="w-full p-5 bg-black/40 border border-white/5 rounded-2xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all focus:bg-black/60 shadow-inner" 
      />
    </div>
  );
}