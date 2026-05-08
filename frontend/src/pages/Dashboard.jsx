import { Users, Activity, TrendingUp, BellRing, RefreshCw, Radio, Newspaper } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

function AnimatedCounter({ value }) {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const numericValue = typeof value === "string" ? Number(value.replace("%", "")) : Number(value);
    if (Number.isNaN(numericValue)) return;
    let start = 0;
    const increment = Math.max(1, numericValue / 40);
    const timer = setInterval(() => {
      start += increment;
      if (start >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else setDisplayValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{displayValue}{typeof value === "string" && value.includes("%") ? "%" : ""}</>;
}

function Dashboard({ darkMode }) {
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-[#020617] text-white" : "bg-[#f5f7fb] text-slate-900"}`}>Loading Dashboard...</div>;

  const cards = [
    { title: "Total Leads", value: stats.total_leads, trend: "+12%", icon: <Users size={22} />, iconBg: "from-indigo-500 to-indigo-700" },
    { title: "Interactions", value: stats.total_interactions, trend: "+18%", icon: <Activity size={22} />, iconBg: "from-purple-500 to-fuchsia-700" },
    { title: "Positive Sentiment", value: `${stats.positive_sentiment}%`, trend: "+9%", icon: <TrendingUp size={22} />, iconBg: "from-green-500 to-emerald-600" },
    { title: "Pending Follow-ups", value: stats.pending_followups, trend: "+4%", icon: <BellRing size={22} />, iconBg: "from-orange-500 to-red-500" },
  ];
  const COLORS = darkMode ? ["#4ade80", "#818cf8", "#f87171"] : ["#22c55e", "#6366f1", "#ef4444"];
  const newsItems = stats.news?.length ? stats.news : ["AI CRM monitoring is active.", "LangGraph is processing interactions live.", "Dashboard analytics are updating automatically."];

  return (
    <div className={`min-h-screen transition-all duration-300 ${darkMode ? "bg-[#020617] text-white" : "bg-[#f5f7fb] text-slate-900"}`}>
      <style>{`@keyframes newsTicker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}.news-track{animation:newsTicker 28s linear infinite}.news-track:hover{animation-play-state:paused}`}</style>
      <div className="max-w-[1700px] mx-auto px-10 py-10 space-y-10">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div>
            <p className={`uppercase tracking-[0.35em] text-xs mb-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>AI-FIRST CRM PLATFORM</p>
            <h1 className="text-5xl font-black tracking-tight">Welcome back, <span className="text-indigo-500">Raaj</span></h1>
            <p className={`mt-5 text-lg max-w-4xl leading-9 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Monitor live CRM activity, HCP interactions, AI-generated summaries, sentiment trends, and follow-up recommendations.</p>
          </div>
          <div className={`rounded-[24px] border px-5 py-4 min-w-[260px] ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-3"><div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center"><Radio className="text-emerald-400" size={20} /></div><div><p className="font-semibold">Live Dashboard</p><p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Last updated: {lastUpdated}</p></div></div>
            <button onClick={loadDashboard} className="mt-4 w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />Refresh Now</button>
          </div>
        </div>
        <div className={`rounded-[26px] border overflow-hidden ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}><div className="flex items-center"><div className="shrink-0 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-3 font-semibold"><Newspaper size={19} />Live Bulletin</div><div className="overflow-hidden flex-1"><div className="news-track flex whitespace-nowrap">{[...newsItems, ...newsItems].map((item, index) => <div key={index} className={`px-8 py-4 text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}><span className="text-indigo-500 mr-3">●</span>{item}</div>)}</div></div></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">{cards.map((item, index) => <motion.div key={index} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} whileHover={{ y: -5 }} className={`rounded-[26px] border p-6 transition-all duration-300 ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}><div className="flex items-center justify-between mb-6"><div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${item.iconBg} flex items-center justify-center text-white shadow-lg`}>{item.icon}</div><span className="text-emerald-400 font-semibold flex items-center gap-1"><TrendingUp size={15} />{item.trend}</span></div><p className={`text-base mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{item.title}</p><h2 className="text-5xl font-black"><AnimatedCounter value={item.value} /></h2><div className={`mt-5 text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Auto-refreshes every 10 seconds</div></motion.div>)}</div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6"><div className={`xl:col-span-2 rounded-[28px] border p-8 ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}><div className="flex items-start justify-between mb-8"><div><h2 className="text-3xl font-bold mb-2">Weekly Interaction Trend</h2><p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Backend-powered CRM interaction movement.</p></div><div className="px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium">Realtime Graph</div></div><div className="h-[330px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.weekly_data || []}><defs><linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.7} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} /></linearGradient></defs><XAxis dataKey="day" stroke={darkMode ? "#94a3b8" : "#64748b"} /><YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} /><Tooltip /><Area type="monotone" dataKey="interactions" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorInteractions)" /></AreaChart></ResponsiveContainer></div></div><div className={`rounded-[28px] border p-8 ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}><h2 className="text-3xl font-bold mb-2">Sentiment Mix</h2><p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Positive, neutral, and negative split.</p><div className="h-[330px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.sentiment_data || []} cx="50%" cy="50%" innerRadius={70} outerRadius={105} paddingAngle={4} dataKey="value" nameKey="name">{(stats.sentiment_data || []).map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></div></div>
        <div className={`rounded-[28px] border p-8 ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}><div className="flex items-center justify-between mb-8"><div><h2 className="text-4xl font-bold mb-2">Live Intelligence Feed</h2><p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>AI-generated live CRM activity insights.</p></div><div className="px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>Live AI Monitoring</div></div><div className="grid grid-cols-1 xl:grid-cols-3 gap-6">{(stats.feed || []).map((item, index) => <motion.div key={index} whileHover={{ y: -4 }} className={`rounded-[24px] border p-6 ${darkMode ? "bg-[#020617] border-white/10" : "bg-slate-50 border-slate-200"}`}><div className="flex items-center gap-3 mb-4"><div className="w-3 h-3 rounded-full bg-indigo-500" /><h3 className="text-xl font-bold">AI Insight</h3></div><p className={`leading-8 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{item.summary || item.notes}</p><div className="mt-4"><span className="text-emerald-400 text-sm capitalize font-medium">{item.sentiment}</span></div></motion.div>)}</div></div>
      </div>
    </div>
  );
}

export default Dashboard;
