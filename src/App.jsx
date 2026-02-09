import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Home, Trash2, LayoutDashboard, Database, Zap, Calendar, BarChart3, LogIn, LogOut, TrendingUp } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

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
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'year'
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

  // Data filtering for charts/stats
  const currentPeriodData = useMemo(() => {
    if (viewMode === 'month') {
      return processedData.filter(d => d.date.startsWith(selectedMonth));
    } else {
      return processedData.filter(d => d.date.startsWith(selectedYear));
    }
  }, [processedData, viewMode, selectedMonth, selectedYear]);

  // Logic for the Yearly Bar Chart (Groups data by month)
  const yearlyGraphData = useMemo(() => {
    if (viewMode !== 'year') return [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((month, index) => {
      const monthStr = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
      const monthEntries = processedData.filter(d => d.date.startsWith(monthStr));
      return {
        name: month,
        produced: monthEntries.reduce((acc, curr) => acc + curr.produced, 0),
        consumed: monthEntries.reduce((acc, curr) => acc + curr.consumed, 0)
      };
    });
  }, [processedData, viewMode, selectedYear]);

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
    if (!id) return;
    if (!adminAuth || !supabase || !window.confirm("Delete this record?")) return;
    const { error } = await supabase.from('daily_readings').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
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
    setFormData({ date: new Date().toISOString().split('T')[0], produced: '', exported: '', imported: '' });
    fetchData();
  };

  if (loading && supabaseUrl) return <div className="flex h-screen items-center justify-center font-bold text-blue-600">Syncing Energy Data...</div>;

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-[#1B2559] pb-12 font-sans">
      <nav className="bg-white border-b h-20 flex items-center px-6 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 font-black text-xl"><Zap className="text-blue-500" fill="currentColor" /> SolarPro</div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('admin')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'admin' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Admin</button>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto p-6">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold">{viewMode === 'month' ? 'Monthly Analysis' : 'Yearly Analysis'}</h2>
              <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border">
                <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
                  <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Month</button>
                  <button onClick={() => setViewMode('year')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'year' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Year</button>
                </div>
                {viewMode === 'month' ? (
                  <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-1 rounded-lg border-none font-bold outline-none text-sm" />
                ) : (
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="p-1 rounded-lg border-none font-bold outline-none text-sm bg-transparent">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatCard title="Solar Yield" total={stats?.totalProduced} avg={stats?.avgProduced} unit="kWh" color="#2dd4bf" 
                details={[{ label: "Self-Used", val: stats?.selfUsed, p: stats?.selfRate, c: "#2dd4bf" }, { label: "Exported", val: stats?.exported, p: 100-stats?.selfRate, c: "#cbd5e1" }]} />
              <StatCard title="House Load" total={stats?.totalConsumed} avg={stats?.avgConsumed} unit="kWh" color="#6366f1" 
                details={[{ label: "Solar Share", val: stats?.selfUsed, p: 100-stats?.gridRate, c: "#818cf8" }, { label: "Imported to Home", val: stats?.imported, p: stats?.gridRate, c: "#312e81" }]} />
            </div>

            <div className="bg-white p-6 rounded-3xl border shadow-sm">
              <h3 className="font-bold mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> {viewMode === 'month' ? 'Daily Energy Curve' : 'Monthly Generation'}</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'month' ? (
                    <AreaChart data={currentPeriodData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.split('-').pop()} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="produced" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.1} name="Solar" />
                      <Area type="monotone" dataKey="consumed" stroke="#6366f1" fill="transparent" strokeDasharray="4 4" name="House" />
                    </AreaChart>
                  ) : (
                    <BarChart data={yearlyGraphData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="produced" fill="#2dd4bf" radius={[4, 4, 0, 0]} name="Solar" />
                      <Bar dataKey="consumed" fill="#6366f1" radius={[4, 4, 0, 0]} name="House" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!adminAuth ? (
              <div className="bg-white p-10 rounded-3xl border shadow-sm max-w-sm mx-auto mt-10 text-center">
                <h2 className="text-xl font-bold mb-4">Admin Access</h2>
                <input type="password" placeholder="Password" className="w-full p-3 border rounded-xl mb-4" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => password === 'admin123' ? setAdminAuth(true) : alert('Wrong Password')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100">Unlock Panel</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit">
                  <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-slate-400">Log New Reading</h3>
                  <form onSubmit={addEntry} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 ml-1">READING DATE</label>
                      <input type="date" className="w-full p-3 border rounded-xl text-sm mt-1" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 ml-1">SOLAR PRODUCED (kWh)</label>
                      <input type="number" step="0.01" className="w-full p-3 border rounded-xl text-sm mt-1" value={formData.produced} onChange={(e) => setFormData({...formData, produced: e.target.value})} required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 ml-1">EXPORTED TO GRID (kWh)</label>
                      <input type="number" step="0.01" className="w-full p-3 border rounded-xl text-sm mt-1" value={formData.exported} onChange={(e) => setFormData({...formData, exported: e.target.value})} required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 ml-1">IMPORTED TO HOME (kWh)</label>
                      <input type="number" step="0.01" className="w-full p-3 border rounded-xl text-sm mt-1" value={formData.imported} onChange={(e) => setFormData({...formData, imported: e.target.value})} required />
                    </div>
                    <button className="w-full bg-[#1B2559] text-white py-3 rounded-xl font-bold hover:bg-blue-900 transition-colors">Save Entry</button>
                  </form>
                </div>
                <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[650px]">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-500 uppercase">Recent History</span>
                    <button onClick={() => setAdminAuth(false)} className="text-[10px] font-bold text-red-500 flex items-center gap-1"><LogOut size={12}/> Logout</button>
                  </div>
                  <div className="overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase sticky top-0">
                        <tr><th className="p-4 text-left">Date</th><th className="p-4 text-right">Solar</th><th className="p-4 text-right">Export</th><th className="p-4 text-right">Import</th><th className="p-4"></th></tr>
                      </thead>
                      <tbody className="divide-y">
                        {solarData.slice().reverse().map(e => (
                          <tr key={e.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-bold">{e.date}</td>
                            <td className="p-4 text-right text-teal-600 font-bold">{e.produced}</td>
                            <td className="p-4 text-right">{e.exported}</td>
                            <td className="p-4 text-right text-indigo-600 font-bold">{e.imported}</td>
                            <td className="p-4 text-center">
                              <button onClick={() => deleteEntry(e.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
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