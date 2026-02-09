import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, Home, Trash2, LayoutDashboard, Database, 
  Zap, Calendar, BarChart3, LogIn, LogOut, 
  TrendingUp, Activity, ArrowDownLeft, ArrowUpRight,
  MousePointerClick, Info, Menu, X
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar 
} from 'recharts';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      netExport: (exp - imp).toFixed(1),
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

  if (loading && supabaseUrl) return <div className="flex h-screen items-center justify-center bg-white"><Zap className="text-indigo-600 animate-bounce" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* MOBILE NAV OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col p-8 space-y-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-black text-xl">SolarPro Menu</h1>
            <X onClick={() => setIsMenuOpen(false)} />
          </div>
          <button onClick={() => {setActiveTab('dashboard'); setIsMenuOpen(false)}} className="text-2xl font-black text-left">Analytics</button>
          <button onClick={() => {setActiveTab('admin'); setIsMenuOpen(false)}} className="text-2xl font-black text-left">Management</button>
        </div>
      )}

      {/* HEADER */}
      <nav className="h-20 bg-white border-b border-slate-200 flex items-center px-6 md:px-10 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="text-white w-4 h-4" fill="currentColor" />
          </div>
          <h1 className="text-lg font-black tracking-tighter">SOLAR<span className="text-indigo-600">PRO</span></h1>
        </div>
        
        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border">
          <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>ANALYTICS</button>
          <button onClick={() => setActiveTab('admin')} className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${activeTab === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>DATABASE</button>
        </div>
        
        <button className="md:hidden p-2" onClick={() => setIsMenuOpen(true)}>
          <Menu />
        </button>
      </nav>

      <main className="max-w-[1400px] mx-auto p-4 md:p-10 pb-24 md:pb-10">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6 md:space-y-10">
            {/* CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl md:rounded-[40px] border border-slate-200 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter">Energy Overview</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Activity size={12} className="text-emerald-500" /> Active Telemetry
                </div>
              </div>

              <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
                <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                  {['day', 'month', 'year'].map(m => (
                    <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{m}</button>
                  ))}
                </div>
                <div className="w-full md:w-auto flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <Calendar size={14} className="text-indigo-500 mr-2" />
                  {viewMode === 'day' ? <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent font-black outline-none text-xs w-full" /> :
                   viewMode === 'month' ? <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent font-black outline-none text-xs w-full" /> :
                   <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent font-black outline-none text-xs w-full"><option value="2026">2026</option><option value="2025">2025</option></select>}
                </div>
              </div>
            </div>

            {/* METRIC CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              <SummaryCard title="Solar Yield" total={stats?.totalProduced} avg={stats?.avgProduced} unit="kWh" icon={<Sun className="text-amber-500" />}
                details={[{ label: "Direct Use", p: stats?.selfRate, c: "bg-amber-400" }, { label: "Grid Feed", p: 100-stats?.selfRate, c: "bg-slate-100" }]} />
              <SummaryCard title="House Load" total={stats?.totalConsumed} avg={stats?.avgConsumed} unit="kWh" icon={<Home className="text-indigo-500" />}
                details={[{ label: "Solar Powered", p: 100-stats?.gridRate, c: "bg-indigo-400" }, { label: "Imported", p: stats?.gridRate, c: "bg-slate-900" }]} />
              
              <div className="bg-white p-8 rounded-3xl md:rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Grid Intelligence</h3>
                <div className="space-y-6">
                  <GridMetric label="Total Exported" val={`${stats?.exported} kWh`} icon={<ArrowUpRight className="text-amber-500"/>} />
                  <GridMetric label="Total Imported" val={`${stats?.imported} kWh`} icon={<ArrowDownLeft className="text-indigo-500"/>} />
                  <div className="pt-6 border-t">
                    <GridMetric label="Net Balance" val={`${stats?.netExport} kWh`} icon={<Zap className="text-emerald-500"/>} sub={Number(stats?.netExport) >= 0 ? "SURPLUS" : "DEFICIT"} />
                  </div>
                </div>
              </div>
            </div>

            {/* CHART */}
            <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[48px] border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-600" /> System Distribution Trend
              </h3>
              <div className="h-64 md:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'year' ? (
                    <BarChart data={processedData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                      <Bar dataKey="produced" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="consumed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <AreaChart data={currentPeriodData}>
                      <defs><linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={9} tickFormatter={(v) => v.split('-').pop()} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="produced" stroke="#f59e0b" strokeWidth={2} fill="transparent" />
                      <Area type="monotone" dataKey="consumed" stroke="#4f46e5" strokeWidth={2} fill="url(#gProd)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {!adminAuth ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-2xl max-w-md mx-auto mt-10 text-center">
                <h2 className="text-xl font-black mb-6 tracking-tighter">Enter Credentials</h2>
                <input type="password" placeholder="••••" className="w-full p-4 bg-slate-50 border rounded-xl text-center mb-4 font-black" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => password === 'admin123' ? setAdminAuth(true) : alert('No')} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black">UNLOCK</button>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-1/3 bg-white p-8 rounded-3xl border shadow-sm">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6">Log Data</h3>
                  <form onSubmit={addEntry} className="space-y-4">
                    <FormRow label="Date" type="date" val={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                    <FormRow label="Solar Yield" type="number" val={formData.produced} onChange={(e) => setFormData({...formData, produced: e.target.value})} />
                    <FormRow label="Export Grid" type="number" val={formData.exported} onChange={(e) => setFormData({...formData, exported: e.target.value})} />
                    <FormRow label="Import Home" type="number" val={formData.imported} onChange={(e) => setFormData({...formData, imported: e.target.value})} />
                    <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-xs">SAVE RECORD</button>
                  </form>
                </div>
                <div className="w-full lg:w-2/3 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[600px]">
                  <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-[9px] font-black text-slate-500 uppercase">
                    Ledger <button onClick={() => setAdminAuth(false)} className="text-red-500 underline">Logout</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase sticky top-0">
                        <tr><th className="p-4 text-left">Date</th><th className="p-4 text-right">Yield</th><th className="p-4 text-right">House</th><th className="p-4"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {solarData.slice().reverse().map(e => (
                          <tr key={e.id} className="hover:bg-slate-50 group">
                            <td className="p-4 font-bold text-slate-400">{e.date}</td>
                            <td className="p-4 text-right font-black text-amber-500">+{e.produced}</td>
                            <td className="p-4 text-right font-black text-slate-900">{(e.produced - e.exported + e.imported).toFixed(1)}</td>
                            <td className="p-4 text-center">
                              <button onClick={() => deleteEntry(e.id)} className="text-red-300 hover:text-red-600"><Trash2 size={16}/></button>
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

// UI BLOCKS
function SummaryCard({ title, total, avg, unit, icon, details }) {
  return (
    <div className="bg-white p-8 rounded-3xl md:rounded-[40px] border border-slate-200 shadow-sm space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</h3>
        </div>
        <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">AVG: {avg}</div>
      </div>
      <div className="space-y-6">
        <h4 className="text-5xl font-black tracking-tighter">{total || '0.0'}<span className="text-sm font-medium text-slate-300 ml-1">{unit}</span></h4>
        <div className="space-y-4">
          {details.map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-slate-400">{item.label}</span><span>{item.p}%</span></div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${item.c}`} style={{ width: `${item.p}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridMetric({ label, val, icon, sub }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-lg font-black leading-none">{val}</p>
        {sub && <p className={`text-[8px] font-black mt-1 ${val.startsWith('-') ? 'text-red-500' : 'text-emerald-500'}`}>{sub}</p>}
      </div>
    </div>
  );
}

function FormRow({ label, type, val, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <input type={type} step="0.01" value={val} onChange={onChange} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" />
    </div>
  );
}