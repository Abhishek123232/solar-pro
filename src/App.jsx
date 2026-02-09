import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, Home, ArrowUpRight, ArrowDownLeft, 
  Plus, Trash2, LayoutDashboard, Database, 
  TrendingUp, LogIn, LogOut, ChevronRight,
  Zap, Clock, Calendar, BarChart3, AlertCircle,
  Filter, Search, Info, Battery, Wind, CloudSun
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area, 
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';

// Helper to safely access environment variables
const getEnv = (key) => {
  try {
    if (typeof window !== 'undefined' && window[key]) return window[key];
    if (import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) { return ''; }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL'); 
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

export default function App() {
  const [supabase, setSupabase] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [solarData, setSolarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminAuth, setAdminAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

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
        const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        setSupabase(client);
      } else {
        setLoading(false);
      }
    };
    script.onerror = () => setLoading(false);
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch(e) {} };
  }, []);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_readings')
        .select('*')
        .order('date', { ascending: true });
      if (!error) setSolarData(data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    if (supabase) {
      fetchData();
    }
  }, [supabase]);

  // NEW LOGIC APPLIED HERE
  const processedData = useMemo(() => {
    return solarData.map(d => {
      const prod = Number(d.produced || 0);
      const exp = Number(d.exported || 0);
      const imp = Number(d.imported || 0);
      // Consumption = (Produced - Exported) + Imported
      const calculatedConsumption = (prod - exp) + imp;

      return {
        ...d,
        consumed: calculatedConsumption
      };
    });
  }, [solarData]);

  const currentPeriodData = useMemo(() => {
    if (viewMode === 'day') return processedData.filter(d => d.date === selectedDate);
    if (viewMode === 'month') return processedData.filter(d => d.date.startsWith(selectedMonth));
    return processedData.filter(d => d.date && d.date.startsWith(selectedYear));
  }, [processedData, viewMode, selectedDate, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    if (currentPeriodData.length === 0) return null;
    const prod = currentPeriodData.reduce((acc, curr) => acc + Number(curr.produced || 0), 0);
    const exp = currentPeriodData.reduce((acc, curr) => acc + Number(curr.exported || 0), 0);
    const imp = currentPeriodData.reduce((acc, curr) => acc + Number(curr.imported || 0), 0);
    const cons = currentPeriodData.reduce((acc, curr) => acc + curr.consumed, 0);
    
    return {
      produced: prod.toFixed(2),
      consumed: cons.toFixed(2),
      exported: exp.toFixed(2),
      imported: imp.toFixed(2),
      selfUsed: (prod - exp).toFixed(2),
      selfConsumptionRate: prod > 0 ? (((prod - exp) / prod) * 100).toFixed(0) : 0,
      gridReliance: cons > 0 ? ((imp / cons) * 100).toFixed(0) : 0
    };
  }, [currentPeriodData]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') setAdminAuth(true);
    else setAuthError('Invalid credentials');
  };

  const addEntry = async (e) => {
    e.preventDefault();
    if (!adminAuth || !supabase) return;
    await supabase.from('daily_readings').insert([{
      date: formData.date,
      produced: parseFloat(formData.produced),
      exported: parseFloat(formData.exported),
      imported: parseFloat(formData.imported)
    }]);
    setFormData({ date: new Date().toISOString().split('T')[0], produced: '', exported: '', imported: '' });
    fetchData();
  };

  const deleteEntry = async (id) => {
    if (!adminAuth || !supabase || !window.confirm("Delete record?")) return;
    await supabase.from('daily_readings').delete().eq('id', id);
    fetchData();
  };

  if (loading && solarData.length === 0 && (supabaseUrl)) return (
    <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-[#1B2559] font-sans pb-12">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 flex justify-between h-20 items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-teal-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">SolarPro</h1>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
              <LayoutDashboard size={16} /> Overview
            </button>
            <button onClick={() => setActiveTab('admin')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
              <Database size={16} /> Management
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <h2 className="text-2xl font-bold">Energy Analysis</h2>
              <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  {['day', 'month', 'year'].map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)} className={`px-5 py-1.5 rounded-lg text-xs font-bold capitalize ${viewMode === mode ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>{mode}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-2 border-l border-slate-200">
                  <Calendar className="text-slate-400" size={16} />
                  {viewMode === 'day' && <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none" />}
                  {viewMode === 'month' && <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-sm font-bold outline-none" />}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnalysisPanel 
                title="Solar Yield" 
                value={stats?.produced || '0.00'} 
                unit="kWh"
                icon={<Sun className="text-teal-400" size={20} />}
                color="#2dd4bf"
                details={[
                  { label: "Self-Used", value: stats?.selfUsed || '0.00', percentage: stats?.selfConsumptionRate || 0, color: '#2dd4bf' },
                  { label: "Exported", value: stats?.exported || '0.00', percentage: 100 - (stats?.selfConsumptionRate || 0), color: '#cbd5e1' }
                ]}
              />

              <AnalysisPanel 
                title="House Load" 
                value={stats?.consumed || '0.00'} 
                unit="kWh"
                icon={<Home className="text-indigo-400" size={20} />}
                color="#6366f1"
                details={[
                  { label: "Solar Share", value: stats?.selfUsed || '0.00', percentage: 100 - (stats?.gridReliance || 0), color: '#818cf8' },
                  { label: "Grid Share", value: stats?.imported || '0.00', percentage: stats?.gridReliance || 0, color: '#312e81' }
                ]}
              />
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold mb-8 flex items-center gap-2"><BarChart3 className="text-blue-600" size={20} /> Power Trends</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentPeriodData}>
                    <defs>
                      <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                    <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="produced" stroke="#2dd4bf" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" name="Solar" />
                    <Area type="monotone" dataKey="consumed" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" fill="transparent" name="House Load" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {!adminAuth ? (
              <div className="bg-white p-12 rounded-[32px] shadow-xl border border-slate-100 text-center max-w-md mx-auto mt-20">
                <LogIn size={32} className="mx-auto mb-6 text-blue-600" />
                <h2 className="text-2xl font-bold mb-2">Secure Access</h2>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="password" placeholder="Admin Password" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button className="w-full bg-[#1B2559] text-white py-4 rounded-2xl font-bold">Authenticate</button>
                </form>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold">Data Management</h2>
                  <button onClick={() => setAdminAuth(false)} className="bg-red-50 text-red-500 px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-all"><LogOut size={16} /> Logout</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                    <form onSubmit={addEntry} className="space-y-5">
                      <label className="text-xs font-bold text-slate-400">DATE</label>
                      <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                      
                      <label className="text-xs font-bold text-slate-400">SOLAR PRODUCED (kWh)</label>
                      <input type="number" step="0.01" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.produced} onChange={(e) => setFormData({...formData, produced: e.target.value})} />
                      
                      <label className="text-xs font-bold text-slate-400">EXPORTED TO GRID (kWh)</label>
                      <input type="number" step="0.01" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.exported} onChange={(e) => setFormData({...formData, exported: e.target.value})} />
                      
                      <label className="text-xs font-bold text-slate-400">IMPORTED FROM HOUSE (kWh)</label>
                      <input type="number" step="0.01" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.imported} onChange={(e) => setFormData({...formData, imported: e.target.value})} />
                      
                      <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">Save Reading</button>
                    </form>
                  </div>
                  <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr><th className="p-4 text-left">Date</th><th className="p-4 text-right">Solar</th><th className="p-4 text-right">Export</th><th className="p-4 text-right">Import</th><th className="p-4 text-right">Actions</th></tr>
                      </thead>
                      <tbody>
                        {solarData.slice().reverse().map(e => (
                          <tr key={e.id} className="border-t">
                            <td className="p-4 font-bold">{e.date}</td>
                            <td className="p-4 text-right text-teal-600">{e.produced}</td>
                            <td className="p-4 text-right text-orange-600">{e.exported}</td>
                            <td className="p-4 text-right text-indigo-600">{e.imported}</td>
                            <td className="p-4 text-right"><button onClick={() => deleteEntry(e.id)} className="text-red-400 p-2"><Trash2 size={16}/></button></td>
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

function AnalysisPanel({ title, value, unit, icon, color, details }) {
  return (
    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-12">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-[10px] border-slate-50"></div>
        <div className="absolute inset-0 rounded-full border-[10px] border-transparent" style={{ borderTopColor: color, transform: 'rotate(45deg)' }}></div>
        <div className="text-center">
          <div className="text-2xl font-black">{value}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{unit}</div>
        </div>
      </div>
      <div className="flex-1 w-full">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-slate-50 p-2 rounded-lg">{icon}</div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="space-y-6">
          {details.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-500 uppercase">{item.label}</span>
                <span className="text-sm font-black">{item.value} {unit}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}