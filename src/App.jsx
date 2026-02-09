import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, Home, Trash2, LayoutDashboard, Database, 
  Zap, Calendar, BarChart3, LogIn, LogOut, TrendingUp 
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar 
} from 'recharts';

// Helper for Environment Variables
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
  const [viewMode, setViewMode] = useState('month'); // 'day', 'month', 'year'
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

  // Initialize Supabase Client
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

  // CORE LOGIC: Consumption = (Produced - Exported) + Imported
  const processedData = useMemo(() => {
    return solarData.map(d => {
      const prod = Number(d.produced || 0);
      const exp = Number(d.exported || 0);
      const imp = Number(d.imported || 0);
      const self = prod - exp;
      return { 
        ...d, 
        consumed: self + imp, 
        selfUsed: self 
      };
    });
  }, [solarData]);

  // Filter data based on View Mode
  const currentPeriodData = useMemo(() => {
    if (viewMode === 'day') return processedData.filter(d => d.date === selectedDate);
    if (viewMode === 'month') return processedData.filter(d => d.date.startsWith(selectedMonth));
    return processedData.filter(d => d.date.startsWith(selectedYear));
  }, [processedData, viewMode, selectedDate, selectedMonth, selectedYear]);

  // Yearly Graph: Aggregate Daily data into Months
  const yearlyGraphData = useMemo(() => {
    if (viewMode !== 'year') return [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((month, index) => {
      const monthPrefix = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
      const monthEntries = processedData.filter(d => d.date.startsWith(monthPrefix));
      return {
        name: month,
        produced: monthEntries.reduce((acc, curr) => acc + curr.produced, 0),
        consumed: monthEntries.reduce((acc, curr) => acc + curr.consumed, 0)
      };
    });
  }, [processedData, viewMode, selectedYear]);

  // Calculate Statistics
  const stats = useMemo(() => {
    if (currentPeriodData.length === 0) return null;
    const count = currentPeriodData.length;
    const prod = currentPeriodData.reduce((acc, curr) => acc + Number(curr.produced || 0), 0);
    const exp = currentPeriodData.reduce((acc, curr) => acc + Number(curr.exported || 0), 0);
    const imp = currentPeriodData.reduce((acc, curr) => acc + Number(curr.imported || 0), 0);
    const cons = currentPeriodData.reduce((acc, curr) => acc + curr.consumed, 0);
    const self = currentPeriodData.reduce((acc, curr) => acc + curr.selfUsed, 0);

    return {
      totalProduced: prod.toFixed(2),
      totalConsumed: cons.toFixed(2),
      avgProduced: (prod / count).toFixed(2),
      avgConsumed: (cons / count).toFixed(2),
      exported: exp.toFixed(2),
      imported: imp.toFixed(2),
      selfUsed: self.toFixed(2),
      selfRate: prod > 0 ? ((self / prod) * 100).toFixed(0) : 0,
      gridRate: cons > 0 ? ((imp / cons) * 100).toFixed(0) : 0
    };
  }, [currentPeriodData]);

  const deleteEntry = async (id) => {
    if (!id) { alert("Cannot delete: Row ID missing. Refresh database structure."); return; }
    if (!adminAuth || !supabase || !window.confirm("Delete this record permanently?")) return;
    const { error } = await supabase.from('daily_readings').delete().eq('id', id);
    if (error) alert("Database Error: " + error.message);
    else fetchData();
  };

  const addEntry = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('daily_readings').insert([{
      date: formData.date,
      produced: parseFloat(formData.produced),
      exported: parseFloat(formData.exported),
      imported: parseFloat(formData.imported)
    }]);
    if (error) alert(error.message);
    else {
      setFormData({ date: new Date().toISOString().split('T')[0], produced: '', exported: '', imported: '' });
      fetchData();
    }
  };

  if (loading && supabaseUrl) return <div className="flex h-screen items-center justify-center font-bold text-blue-500">Connecting to SolarPro...</div>;

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-[#1B2559] pb-12 font-sans">
      <nav className="bg-white border-b h-20 flex items-center px-6 justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 font-black text-xl text-blue-600"><Zap fill="currentColor" /> SolarPro</div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('admin')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'admin' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Management</button>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto p-6">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold">Performance Analytics</h2>
              <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border">
                <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
                  {['day', 'month', 'year'].map(m => (
                    <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase ${viewMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{m}</button>
                  ))}
                </div>
                {viewMode === 'day' && <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-1 font-bold outline-none text-sm" />}
                {viewMode === 'month' && <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-1 font-bold outline-none text-sm" />}
                {viewMode === 'year' && (
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="p-1 font-bold outline-none text-sm bg-transparent">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatCard title="Total Solar" total={stats?.totalProduced} avg={stats?.avgProduced} unit="kWh" color="#2dd4bf" 
                details={[{ label: "Self-Used", val: stats?.selfUsed, p: stats?.selfRate, c: "#2dd4bf" }, { label: "Exported", val: stats?.exported, p: 100-stats?.selfRate, c: "#cbd5e1" }]} />
              <StatCard title="House Load" total={stats?.totalConsumed} avg={stats?.avgConsumed} unit="kWh" color="#6366f1" 
                details={[{ label: "Solar Share", val: stats?.selfUsed, p: 100-stats?.gridRate, c: "#818cf8" }, { label: "Imported to Home", val: stats?.imported, p: stats?.gridRate, c: "#312e81" }]} />
            </div>

            <div className="bg-white p-6 rounded-3xl border shadow-sm">
              <h3 className="font-bold mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> Energy Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'year' ? (
                    <BarChart data={yearlyGraphData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="produced" fill="#2dd4bf" radius={[4, 4, 0, 0]} name="Solar" />
                      <Bar dataKey="consumed" fill="#6366f1" radius={[4, 4, 0, 0]} name="House" />
                    </BarChart>
                  ) : (
                    <AreaChart data={currentPeriodData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.split('-').pop()} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="produced" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.1} name="Solar" />
                      <Area type="monotone" dataKey="consumed" stroke="#6366f1" fill="transparent" strokeDasharray="4 4" name="House" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!adminAuth ? (
              <div className="bg-white p-10 rounded-3xl border shadow-sm max-w-sm mx-auto mt-10 text-center">
                <LogIn size={40} className="mx-auto text-blue-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Admin Portal</h2>
                <p className="text-xs text-slate-400 mb-6">Enter password to manage energy logs</p>
                <input type="password" placeholder="Password" className="w-full p-3 border rounded-xl mb-4 text-center outline-none focus:ring-1 ring-blue-500" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => password === 'admin123' ? setAdminAuth(true) : alert('Access Denied')} className="w-full bg-[#1B2559] text-white py-3 rounded-xl font-bold shadow-lg">Authenticate</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit">
                  <h3 className="font-bold mb-6 text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2"><Calendar size={14}/> Log Reading</h3>
                  <form onSubmit={addEntry} className="space-y-4">
                    <input type="date" className="w-full p-3 border rounded-xl text-sm" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
                    <input type="number" step="0.01" placeholder="Solar Produced (kWh)" className="w-full p-3 border rounded-xl text-sm" value={formData.produced} onChange={(e) => setFormData({...formData, produced: e.target.value})} required />
                    <input type="number" step="0.01" placeholder="Exported to Grid (kWh)" className="w-full p-3 border rounded-xl text-sm" value={formData.exported} onChange={(e) => setFormData({...formData, exported: e.target.value})} required />
                    <input type="number" step="0.01" placeholder="Imported to Home (kWh)" className="w-full p-3 border rounded-xl text-sm" value={formData.imported} onChange={(e) => setFormData({...formData, imported: e.target.value})} required />
                    <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">Save Reading</button>
                  </form>
                  <button onClick={() => setAdminAuth(false)} className="w-full mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors">Logout Session</button>
                </div>
                <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[600px]">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase sticky top-0">
                      <tr><th className="p-4 text-left">Date</th><th className="p-4 text-right">Solar</th><th className="p-4 text-right">Export</th><th className="p-4 text-right">Import</th><th className="p-4"></th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {solarData.slice().reverse().map(e => (
                        <tr key={e.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold">{e.date}</td>
                          <td className="p-4 text-right text-teal-600 font-bold">{e.produced}</td>
                          <td className="p-4 text-right text-slate-400">{e.exported}</td>
                          <td className="p-4 text-right text-indigo-600 font-bold">{e.imported}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => deleteEntry(e.id)} className="text-red-300 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, total, avg, color, details }) {
  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-3xl font-black">{total || '0.00'} <span className="text-sm font-normal text-slate-400">kWh</span></h3>
        </div>
        <div className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-lg">AVG: {avg || '0'} / day</div>
      </div>
      <div className="space-y-4">
        {details.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-500 uppercase">{item.label}</span>
              <span>{item.val} kWh ({item.p}%)</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-700" style={{ width: `${item.p}%`, backgroundColor: item.c }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}