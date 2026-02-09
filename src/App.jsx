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

/**
 * FIX: Switched to a compatible script loader for the preview environment 
 * to resolve "@supabase/supabase-js" and "import.meta" errors.
 */

// Helper to safely access environment variables in different environments
const getEnv = (key) => {
  try {
    // 1. Check window object (for direct injection)
    if (typeof window !== 'undefined' && window[key]) return window[key];
    // 2. Check Vite meta env
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) { return ''; }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || ''; 
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || '';

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
    consumed: '',
    exported: '',
    imported: ''
  });

  // Dynamically load Supabase to ensure compatibility in the preview environment
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = () => {
      if (window.supabase && supabaseUrl && supabaseAnonKey) {
        const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        setSupabase(client);
      } else {
        // Fallback for demo if no keys are provided
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
      const channel = supabase.channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_readings' }, () => fetchData())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [supabase]);

  const currentPeriodData = useMemo(() => {
    if (!solarData) return [];
    if (viewMode === 'day') return solarData.filter(d => d.date === selectedDate);
    if (viewMode === 'month') return solarData.filter(d => d.date.startsWith(selectedMonth));
    return solarData.filter(d => d.date && d.date.startsWith(selectedYear));
  }, [solarData, viewMode, selectedDate, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    if (currentPeriodData.length === 0) return null;
    const prod = currentPeriodData.reduce((acc, curr) => acc + Number(curr.produced || 0), 0);
    const cons = currentPeriodData.reduce((acc, curr) => acc + Number(curr.consumed || 0), 0);
    const exp = currentPeriodData.reduce((acc, curr) => acc + Number(curr.exported || 0), 0);
    const imp = currentPeriodData.reduce((acc, curr) => acc + Number(curr.imported || 0), 0);
    
    return {
      produced: prod.toFixed(2),
      consumed: cons.toFixed(2),
      exported: exp.toFixed(2),
      imported: imp.toFixed(2),
      toHome: (prod - exp).toFixed(2),
      fromSystem: (cons - imp).toFixed(2),
      selfConsumption: prod > 0 ? (((prod - exp) / prod) * 100).toFixed(0) : 0,
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
      ...formData,
      produced: parseFloat(formData.produced),
      consumed: parseFloat(formData.consumed),
      exported: parseFloat(formData.exported),
      imported: parseFloat(formData.imported)
    }]);
    setFormData({ date: new Date().toISOString().split('T')[0], produced: '', consumed: '', exported: '', imported: '' });
    fetchData();
  };

  const deleteEntry = async (id) => {
    if (!adminAuth || !supabase || !window.confirm("Delete record?")) return;
    await supabase.from('daily_readings').delete().eq('id', id);
    fetchData();
  };

  if (loading && solarData.length === 0 && (supabaseUrl !== '')) return (
    <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-[#1B2559] font-sans pb-12">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 flex justify-between h-20 items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-teal-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
              <Zap className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SolarPro</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Energy Intelligence</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <LayoutDashboard size={16} /> Overview
            </button>
            <button onClick={() => setActiveTab('admin')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Database size={16} /> Management
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Connection Warning for User */}
        {(!supabaseUrl || !supabaseAnonKey) && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700 text-sm">
            <AlertCircle size={18} />
            <p><strong>Setup Required:</strong> Please add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to see live data.</p>
          </div>
        )}

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h2 className="text-2xl font-bold">Energy Analysis</h2>
                <div className="flex items-center gap-4 mt-2 text-slate-500">
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-slate-100">
                    <CloudSun size={14} className="text-orange-400" />
                    <span>Local Climate: Active</span>
                  </div>
                  <span className="text-xs">{new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                  {['day', 'month', 'year'].map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${viewMode === mode ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{mode}</button>
                  ))}
                </div>
                <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
                <div className="flex items-center gap-2 pr-2">
                  <Calendar className="text-slate-400" size={16} />
                  {viewMode === 'day' && <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none" />}
                  {viewMode === 'month' && <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-sm font-bold outline-none" />}
                  {viewMode === 'year' && (
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-sm font-bold outline-none">
                      {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnalysisPanel 
                title="Yield" 
                value={stats?.produced || '0.00'} 
                unit="kWh"
                icon={<Sun className="text-teal-400" size={20} />}
                color="#86efac"
                details={[
                  { label: "System To Home", value: stats?.toHome || '0.00', percentage: stats?.selfConsumption || 0, color: '#2dd4bf' },
                  { label: "System To Grid", value: stats?.exported || '0.00', percentage: 100 - (stats?.selfConsumption || 0), color: '#cbd5e1' }
                ]}
              />

              <AnalysisPanel 
                title="Consumption" 
                value={stats?.consumed || '0.00'} 
                unit="kWh"
                icon={<Zap className="text-yellow-400" size={20} />}
                color="#fde047"
                details={[
                  { label: "From System", value: stats?.fromSystem || '0.00', percentage: 100 - (stats?.gridReliance || 0), color: '#fbbf24' },
                  { label: "From Grid", value: stats?.imported || '0.00', percentage: stats?.gridReliance || 0, color: '#f59e0b' }
                ]}
              />
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
               <h3 className="text-lg font-bold mb-8 flex items-center gap-2"><Wind className="text-blue-500" size={20} /> Real-time System Flow</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                 <FlowCard label="Solar" value={stats ? `${(stats.produced / 10).toFixed(2)} kW` : '0.00 kW'} icon={<Sun className="text-orange-400" />} />
                 <FlowCard label="Grid" value={stats ? `${(stats.imported / 10).toFixed(2)} kW` : '0.00 kW'} icon={<Zap className="text-blue-400" />} />
                 <FlowCard label="Inverter" value="Active" icon={<ArrowUpRight className="text-teal-500" />} />
                 <FlowCard label="Load" value={stats ? `${(stats.consumed / 10).toFixed(2)} kW` : '0.00 kW'} icon={<Home className="text-indigo-400" />} />
               </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold mb-8 flex items-center gap-2"><BarChart3 className="text-blue-600" size={20} /> Power Generation Curve</h3>
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
                    <Area type="monotone" dataKey="produced" stroke="#2dd4bf" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" name="Yield" />
                    <Area type="monotone" dataKey="consumed" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" fill="transparent" name="Load" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {!adminAuth ? (
              <div className="bg-white p-12 rounded-[32px] shadow-xl border border-slate-100 text-center max-w-md mx-auto mt-20">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LogIn size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Secure Access</h2>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="password" placeholder="Admin Password" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" value={password} onChange={(e) => setPassword(e.target.value)} />
                  {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
                  <button className="w-full bg-[#1B2559] text-white py-4 rounded-2xl font-bold hover:bg-blue-900 shadow-lg shadow-blue-100 transition-all">Authenticate</button>
                </form>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
                  <div><h2 className="text-xl font-bold">Data Management</h2></div>
                  <button onClick={() => setAdminAuth(false)} className="bg-red-50 text-red-500 px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-all"><LogOut size={16} /> Logout</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                    <form onSubmit={addEntry} className="space-y-5">
                      <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                      <input type="number" step="0.01" placeholder="Produced" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.produced} onChange={(e) => setFormData({...formData, produced: e.target.value})} />
                      <input type="number" step="0.01" placeholder="Consumed" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.consumed} onChange={(e) => setFormData({...formData, consumed: e.target.value})} />
                      <input type="number" step="0.01" placeholder="Exported" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.exported} onChange={(e) => setFormData({...formData, exported: e.target.value})} />
                      <input type="number" step="0.01" placeholder="Imported" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.imported} onChange={(e) => setFormData({...formData, imported: e.target.value})} />
                      <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">Submit</button>
                    </form>
                  </div>
                  <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr><th className="p-4 text-left">Date</th><th className="p-4 text-right">Production</th><th className="p-4 text-right">Actions</th></tr>
                      </thead>
                      <tbody>
                        {solarData.slice().reverse().map(e => (
                          <tr key={e.id} className="border-t">
                            <td className="p-4 font-bold">{e.date}</td>
                            <td className="p-4 text-right">{e.produced} kWh</td>
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
      <div className="relative w-48 h-48 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-[12px] border-slate-50"></div>
        <div className="absolute inset-0 rounded-full border-[12px] border-transparent" style={{ borderTopColor: color, transform: 'rotate(45deg)' }}></div>
        <div className="text-center">
          <div className="text-3xl font-black">{value}</div>
          <div className="text-xs font-bold text-slate-400">{unit}</div>
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
                <span className="text-sm font-bold text-slate-500">{item.label}</span>
                <span className="text-sm font-black">{item.value} {unit}</span>
              </div>
              <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowCard({ label, value, icon }) {
  return (
    <div className="flex flex-col items-center text-center space-y-3 group">
      <div className="w-16 h-16 bg-slate-50 rounded-[20px] flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-all">
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</div>
        <div className="text-lg font-black">{value}</div>
      </div>
    </div>
  );
}