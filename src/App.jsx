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
  const [viewMode, setViewMode] = useState('month'); // Default to month for better overview
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
      return { ...d, consumed: (prod - exp) + imp, selfUsed: prod - exp };
    });
  }, [solarData]);

  const currentPeriodData = useMemo(() => {
    if (viewMode === 'day') return processedData.filter(d => d.date === selectedDate);
    if (viewMode === 'month') return processedData.filter(d => d.date.startsWith(selectedMonth));
    return processedData.filter(d => d.date && d.date.startsWith(selectedYear));
  }, [processedData, viewMode, selectedDate, selectedMonth, selectedYear]);

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
    if (!adminAuth || !supabase || !window.confirm("Confirm deletion of this record?")) return;
    const { error } = await supabase.from('daily_readings').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    else fetchData();
  };

  const addEntry = async (e) => {
    e.preventDefault();
    await supabase.from('daily_readings').insert([{
      date: formData.date,
      produced: parseFloat(formData.produced),
      exported: parseFloat(formData.exported),
      imported: parseFloat(formData.imported)
    }]);
    setFormData({ date: new Date().toISOString().split('T')[0], produced: '', exported: '', imported: '' });
    fetchData();
  };

  if (loading && supabaseUrl) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-[#1B2559] pb-12">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 h-20 flex items-center">
        <div className="max-w-[1400px] mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-3"><Zap className="text-blue-500" /> <h1 className="text-xl font-bold">SolarPro</h1></div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('admin')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'admin' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Admin</button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Energy Analysis</h2>
              <div className="flex gap-4 bg-white p-2 rounded-2xl shadow-sm border">
                <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold outline-none">
                  <option value="day">Daily</option>
                  <option value="month">Monthly</option>
                </select>
                {viewMode === 'day' ? <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="font-bold outline-none text-sm"/> : 
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="font-bold outline-none text-sm"/>}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnalysisPanel title="Solar Yield" total={stats?.totalProduced} avg={stats?.avgProduced} unit="kWh" color="#2dd4bf" 
                details={[{ label: "Self-Used", val: stats?.selfUsed, p: stats?.selfRate, c: "#2dd4bf" }, { label: "Exported", val: stats?.exported, p: 100-stats?.selfRate, c: "#cbd5e1" }]} />
              <AnalysisPanel title="House Load" total={stats?.totalConsumed} avg={stats?.avgConsumed} unit="kWh" color="#6366f1" 
                details={[{ label: "Solar Share", val: stats?.selfUsed, p: 100-stats?.gridRate, c: "#818cf8" }, { label: "Imported to Home", val: stats?.imported, p: stats?.gridRate, c: "#312e81" }]} />
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm border">
              <h3 className="text-lg font-bold mb-8">Performance Chart</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentPeriodData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" fontSize={11} tickFormatter={(v) => v.split('-').pop()} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="produced" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.1} name="Solar" />
                    <Area type="monotone" dataKey="consumed" stroke="#6366f1" fill="transparent" strokeDasharray="5 5" name="House Load" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8">
            {!adminAuth ? (
              <div className="bg-white p-12 rounded-[32px] shadow-xl text-center max-w-md mx-auto mt-20 border">
                <h2 className="text-2xl font-bold mb-6">Admin Login</h2>
                <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl border mb-4 outline-none" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => password === 'admin123' ? setAdminAuth(true) : alert('Wrong!')} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">Login</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[32px] border shadow-sm h-fit">
                  <h3 className="font-bold mb-6">New Reading</h3>
                  <form onSubmit={addEntry} className="space-y-4">
                    <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
                    <input type="number" step="0.01" placeholder="Solar Produced" className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.produced} onChange={(e) => setFormData({...formData, produced: e.target.value})} required />
                    <input type="number" step="0.01" placeholder="Exported to Grid" className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.exported} onChange={(e) => setFormData({...formData, exported: e.target.value})} required />
                    <input type="number" step="0.01" placeholder="Imported to Home" className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.imported} onChange={(e) => setFormData({...formData, imported: e.target.value})} required />
                    <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">Add Data</button>
                  </form>
                </div>
                <div className="lg:col-span-2 bg-white rounded-[32px] border shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                      <tr><th className="p-4 text-left">Date</th><th className="p-4 text-right">Solar</th><th className="p-4 text-right">Export</th><th className="p-4 text-right">Import</th><th className="p-4 text-center">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {solarData.slice().reverse().map(e => (
                        <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-medium">{e.date}</td>
                          <td className="p-4 text-right font-bold text-teal-600">{e.produced}</td>
                          <td className="p-4 text-right text-slate-500">{e.exported}</td>
                          <td className="p-4 text-right text-blue-600">{e.imported}</td>
                          <td className="p-4 text-center"><button onClick={() => deleteEntry(e.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button></td>
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

function AnalysisPanel({ title, total, avg, unit, color, details }) {
  return (
    <div className="bg-white p-8 rounded-[32px] shadow-sm border flex flex-col md:flex-row items-center gap-10">
      <div className="text-center md:text-left">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</h3>
        <div className="text-4xl font-black mb-1">{total || '0.00'} <span className="text-lg font-normal text-slate-400">{unit}</span></div>
        <div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full inline-block">AVG: {avg || '0.00'} {unit}/day</div>
      </div>
      <div className="flex-1 w-full space-y-5 border-l border-slate-100 pl-0 md:pl-10">
        {details.map((item, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-500">{item.label}</span>
              <span>{item.val} {unit} ({item.p}%)</span>
            </div>
            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-1000" style={{ width: `${item.p}%`, backgroundColor: item.c }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}