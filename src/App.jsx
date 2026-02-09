import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, Home, Trash2, LayoutDashboard, Database, 
  Zap, Calendar, BarChart3, LogIn, LogOut, 
  TrendingUp, Activity, ArrowDownLeft, ArrowUpRight,
  MousePointerClick, ChevronLeft, ChevronRight, Info
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar 
} from 'recharts';

/**
 * UPDATED LOGIC:
 * 1. Total Exported = Sum of units sent to grid.
 * 2. Total Imported = Sum of units taken from grid.
 * 3. Net Exported = Total Exported - Total Imported.
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
      return { ...d, consumed: self + imp, selfUsed: self };
    });
  }, [solarData]);

  const currentPeriodData = useMemo(() => {
    if (viewMode === 'day') return processedData.filter(d => d.date === selectedDate);
    if (viewMode === 'month') return processedData.filter(d => d.date.startsWith(selectedMonth));
    return processedData.filter(d => d.date.startsWith(selectedYear));
  }, [processedData, viewMode, selectedDate, selectedMonth, selectedYear]);

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
      netExport: (exp - imp).toFixed(1), // Net calculation
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

  if (loading && supabaseUrl) return <div className="flex h-screen items-center justify-center bg-white text-blue-600 font-bold uppercase tracking-widest animate-pulse">Initializing Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* NAVBAR */}
      <nav className="border-b border-slate-200 bg-white/90 backdrop-blur-md h-20 flex items-center px-10 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Zap className="text-white w-5 h-5" fill="currentColor" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900">SOLAR<span className="text-indigo-600">PRO</span></h1>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button onClick={() => setActiveTab('dashboard')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>ANALYTICS</button>
          <button onClick={() => setActiveTab('admin')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>DATABASE</button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-10">
        {activeTab === 'dashboard' ? (
          <div className="space-y-10 animate-in fade-in duration-700">
            
            {/* DATE CONTROLS */}
            <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-6 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">System Intelligence</h2>
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <Activity size={12} className="text-emerald-500" /> All systems operational
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  {['day', 'month', 'year'].map(m => (
                    <button key={m} onClick={() => setViewMode(m)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{m}</button>
                  ))}
                </div>
                <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                <div className="flex items-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <Calendar size={14} className="text-indigo-500 mr-2" />
                  {viewMode === 'day' ? <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent font-black outline-none text-xs" /> :
                   viewMode === 'month' ? <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent font-black outline-none text-xs" /> :
                   <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent font-black outline-none text-xs"><option value="2026">2026</option><option value="2025">2025</option></select>}
                </div>
              </div>
            </div>

            {/* MAIN STATS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <MetricCard title="Solar Harvest" total={stats?.totalProduced} avg={stats?.avgProduced} color="bg-amber-400" icon={<Sun size={20}/>} 
                details={[{ label: "Direct Use", p: stats?.selfRate, c: "bg-amber-400" }, { label: "Grid Feed", p: 100-stats?.selfRate, c: "bg-slate-200" }]} />
              <MetricCard title="House Demand" total={stats?.totalConsumed} avg={stats?.avgConsumed} color="bg-indigo-600" icon={<Home size={20}/>} 
                details={[{ label: "Solar Share", p: 100-stats?.gridRate, c: "bg-indigo-400" }, { label: "Grid Import", p: stats?.gridRate, c: "bg-slate-900" }]} />
              
              {/* NEW EXPORT/IMPORT ANALYTICS PANEL */}
              <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="space-y-8">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Grid Exchange Analytics</h3>
                  <div className="space-y-6">
                    <GridStat label="Total Exported" val={`${stats?.exported} kWh`} icon={<ArrowUpRight className="text-amber-500"/>} />
                    <GridStat label="Total Imported" val={`${stats?.imported} kWh`} icon={<ArrowDownLeft className="text-indigo-500"/>} />
                    <div className="pt-6 border-t">
                      <GridStat label="Net Grid Export" val={`${stats?.netExport} kWh`} icon={<Zap className="text-emerald-500"/>} sub={Number(stats?.netExport) >= 0 ? "SURPLUS" : "DEFICIT"} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CHART */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm relative overflow-hidden group">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 mb-12">
                <BarChart3 size={16} className="text-indigo-600" /> Load Distribution Trends
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'year' ? (
                    <BarChart data={yearlyGraphData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                      <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                      <Bar dataKey="produced" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={30} />
                      <Bar dataKey="consumed" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={30} />
                    </BarChart>
                  ) : (
                    <AreaChart data={currentPeriodData}>
                      <defs><linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.split('-').pop()} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                      <Tooltip />
                      <Area type="monotone" dataKey="produced" stroke="#f59e0b" strokeWidth={3} fill="transparent" />
                      <Area type="monotone" dataKey="consumed" stroke="#4f46e5" strokeWidth={3} fill="url(#areaColor)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-10">
            {!adminAuth ? (
              <div className="bg-white p-16 rounded-[56px] border border-slate-200 shadow-2xl max-w-lg mx-auto mt-10 text-center">
                <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tighter uppercase">Authorized Entry Only</h2>
                <input type="password" placeholder="Passcode" className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 mb-6 text-center font-black tracking-[0.5em] outline-none" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => password === 'admin123' ? setAdminAuth(true) : alert('Denied')} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl">UNLOCK DATABASE</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="bg-white p-10 rounded-[40px] border border-slate-200 h-fit shadow-sm">
                  <h3 className="font-black text-[10px] uppercase text-slate-400 mb-8 tracking-widest">Add Daily Record</h3>
                  <form onSubmit={addEntry} className="space-y-6">
                    <FormInput label="Date" type="date" val={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                    <FormInput label="Solar Produced (kWh)" type="number" val={formData.produced} onChange={(e) => setFormData({...formData, produced: e.target.value})} />
                    <FormInput label="Exported to Grid (kWh)" type="number" val={formData.exported} onChange={(e) => setFormData({...formData, exported: e.target.value})} />
                    <FormInput label="Imported to Home (kWh)" type="number" val={formData.imported} onChange={(e) => setFormData({...formData, imported: e.target.value})} />
                    <button className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 text-xs uppercase tracking-widest">
                      <MousePointerClick size={16}/> Push to Cloud
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[750px]">
                  <div className="p-6 bg-slate-50 border-b flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Master Energy Ledger <button onClick={() => setAdminAuth(false)} className="text-red-500 hover:underline">Logout</button>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase sticky top-0 z-10">
                        <tr><th className="p-6 text-left">Date</th><th className="p-6 text-right">Solar</th><th className="p-6 text-right">House</th><th className="p-6"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {solarData.slice().reverse().map(e => (
                          <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-6 font-bold text-slate-400">{e.date}</td>
                            <td className="p-6 text-right font-black text-amber-500">+{e.produced}</td>
                            <td className="p-6 text-right font-black text-slate-800">{(e.produced - e.exported + e.imported).toFixed(2)}</td>
                            <td className="p-6 text-center"><button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-600 transition-all"><Trash2 size={18}/></button></td>
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

// SUB-COMPONENTS
function MetricCard({ title, total, avg, icon, details }) {
  return (
    <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col items-start gap-10">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">{icon}</div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h3>
        </div>
        {avg && <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Avg: {avg}</div>}
      </div>
      <div className="w-full space-y-8">
        <h4 className="text-6xl font-black text-slate-900 tracking-tighter">{total || '0.0'}<span className="text-lg font-medium text-slate-300 ml-2">kWh</span></h4>
        <div className="space-y-4">
          {details.map((item, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">{item.label}</span><span className="text-slate-900">{item.p}%</span></div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${item.c}`} style={{ width: `${item.p}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridStat({ label, val, icon, sub }) {
  return (
    <div className="flex items-start gap-5">
      <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-slate-900 leading-tight mt-1">{val}</p>
        {sub && <p className={`text-[8px] font-black mt-1 ${val.startsWith('-') ? 'text-red-500' : 'text-emerald-500'}`}>{sub}</p>}
      </div>
    </div>
  );
}

function FormInput({ label, type, val, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <input type={type} step="0.01" value={val} onChange={onChange} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold text-sm outline-none focus:border-indigo-500/50 transition-all" />
    </div>
  );
}