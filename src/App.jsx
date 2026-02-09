import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, Home, Trash2, LayoutDashboard, Database, 
  Zap, Calendar, BarChart3, LogIn, LogOut, 
  TrendingUp, Activity, ArrowDownLeft, ArrowUpRight,
  ShieldCheck, MousePointerClick, ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell 
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

  if (loading && supabaseUrl) return <div className="flex h-screen items-center justify-center bg-slate-50 text-blue-600 font-bold uppercase tracking-widest animate-pulse">Solar Intelligence Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-100">
      {/* NAVIGATION */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md h-20 flex items-center px-10 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Zap className="text-white w-6 h-6" fill="currentColor" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">SOLAR<span className="text-blue-600">PRO</span></h1>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>OVERVIEW</button>
          <button onClick={() => setActiveTab('admin')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>RECORDS</button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-10">
        {activeTab === 'dashboard' ? (
          <div className="space-y-10">
            {/* NEW MECHANISM: DATE SELECTOR */}
            <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Energy Intelligence</h2>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-widest text-[10px]">Active Monitoring System</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['day', 'month', 'year'].map(m => (
                    <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{m}</button>
                  ))}
                </div>
                <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                  <Calendar size={14} className="text-blue-500" />
                  {viewMode === 'day' ? <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent font-black outline-none text-xs" /> :
                   viewMode === 'month' ? <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent font-black outline-none text-xs" /> :
                   <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent font-black outline-none text-xs"><option value="2026">2026</option><option value="2025">2025</option></select>}
                </div>
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <SummaryCard title="Solar Yield" total={stats?.totalProduced} avg={stats?.avgProduced} unit="kWh" icon={<Sun className="text-amber-500" />} color="bg-amber-500" 
                details={[{ label: "Used", p: stats?.selfRate, c: "bg-amber-500" }, { label: "Exported", p: 100-stats?.selfRate, c: "bg-slate-200" }]} />
              <SummaryCard title="House Load" total={stats?.totalConsumed} avg={stats?.avgConsumed} unit="kWh" icon={<Home className="text-indigo-500" />} color="bg-indigo-500" 
                details={[{ label: "Solar", p: 100-stats?.gridRate, c: "bg-indigo-400" }, { label: "Imported", p: stats?.gridRate, c: "bg-indigo-900" }]} />
              <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Intelligence</h3>
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">Solar Independence</span><span className="text-lg font-black text-blue-600">{100-stats?.gridRate}%</span></div>
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">Grid Reliance</span><span className="text-lg font-black text-slate-800">{stats?.gridRate}%</span></div>
                </div>
                <div className="pt-6 border-t mt-6 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[9px] font-black text-slate-400">LIVE FEED CONNECTED</span></div>
              </div>
            </div>

            {/* CHART */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={16} /> Power Analysis Chart</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase">Production</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-200"></div><span className="text-[10px] font-bold text-slate-500 uppercase">Consumption</span></div>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'year' ? (
                    <BarChart data={yearlyGraphData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" fontSize={10} tick={{fill: '#94A3B8'}} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} tick={{fill: '#94A3B8'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="produced" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="consumed" fill="#E2E8F0" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : (
                    <AreaChart data={currentPeriodData}>
                      <defs><linearGradient id="colProd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.split('-').pop()} tick={{fill: '#94A3B8'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="produced" stroke="#3B82F6" strokeWidth={3} fill="url(#colProd)" />
                      <Area type="monotone" dataKey="consumed" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            {!adminAuth ? (
              <div className="bg-white p-16 rounded-[56px] border border-slate-200 shadow-2xl max-w-md mx-auto mt-20 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8"><LogIn className="text-blue-600 w-10 h-10" /></div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Secure Access</h2>
                <p className="text-slate-400 text-sm mb-10 font-medium">Verify administrator session</p>
                <input type="password" placeholder="Passcode" className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 mb-6 text-center font-bold tracking-[0.3em] outline-none" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => password === 'admin123' ? setAdminAuth(true) : alert('Denied')} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-all">UNLOCK</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm h-fit">
                  <h3 className="font-black text-xs uppercase text-slate-400 mb-8 tracking-widest">New Entry</h3>
                  <form onSubmit={addEntry} className="space-y-6">
                    <InputBox label="Date" type="date" val={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                    <InputBox label="Yield (kWh)" type="number" val={formData.produced} onChange={(e) => setFormData({...formData, produced: e.target.value})} />
                    <InputBox label="Export (kWh)" type="number" val={formData.exported} onChange={(e) => setFormData({...formData, exported: e.target.value})} />
                    <InputBox label="Import (kWh)" type="number" val={formData.imported} onChange={(e) => setFormData({...formData, imported: e.target.value})} />
                    <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg shadow-slate-200 flex items-center justify-center gap-2">
                      <MousePointerClick size={16}/> SAVE LOG
                    </button>
                  </form>
                  <button onClick={() => setAdminAuth(false)} className="w-full mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logout Session</button>
                </div>
                <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden h-[700px] flex flex-col">
                  <div className="p-6 border-b bg-slate-50 font-black text-[10px] uppercase text-slate-500 tracking-widest">System Master Ledger</div>
                  <div className="overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase sticky top-0">
                        <tr><th className="p-5 text-left">Date</th><th className="p-5 text-right">Yield</th><th className="p-5 text-right">House</th><th className="p-5"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {solarData.slice().reverse().map(e => (
                          <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-5 font-bold text-slate-400">{e.date}</td>
                            <td className="p-5 text-right font-black text-blue-600">+{e.produced}</td>
                            <td className="p-5 text-right font-black text-slate-800">{(e.produced - e.exported + e.imported).toFixed(2)}</td>
                            <td className="p-5 text-center"><button onClick={() => deleteEntry(e.id)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
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

// COMPONENTS
function SummaryCard({ title, total, avg, icon, details }) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col items-start gap-8 hover:border-blue-200 transition-all group">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-all">{icon}</div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</h3>
        </div>
        {avg && <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">Avg: {avg}</div>}
      </div>
      <div className="w-full space-y-8">
        <h4 className="text-5xl font-black text-slate-900 tracking-tighter">{total || '0.0'}<span className="text-base font-bold text-slate-300 ml-2 uppercase">kWh</span></h4>
        <div className="space-y-4">
          {details.map((item, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter"><span className="text-slate-500">{item.label}</span><span className="text-slate-900">{item.p}%</span></div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${item.c}`} style={{ width: `${item.p}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InputBox({ label, type, val, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <input type={type} step="0.01" value={val} onChange={onChange} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold text-sm outline-none focus:border-blue-500/50 transition-all" />
    </div>
  );
}