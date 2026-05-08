import { useEffect, useState } from "react";
import { ClipboardList, Sparkles, Activity, Trash2, Brain, MessageSquare, Search, Filter, WandSparkles, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../config";

function Interaction({ darkMode }) {
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [followupResult, setFollowupResult] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/interactions`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Failed to fetch interactions:", err); }
  };
  useEffect(() => { fetchHistory(); }, []);

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: `Log interaction: ${notes}`, session_id: "user1" }) });
      const data = await res.json();
      setResult(data.result); setNotes(""); fetchHistory();
    } catch (err) { console.error("Interaction submit failed:", err); }
    finally { setLoading(false); }
  };

  const handleSuggestFollowups = async () => {
    const latest = notes || history[0]?.notes || "Doctor was interested in product and asked for samples";
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: `Suggest follow ups for this interaction: ${latest}`, session_id: "user1" }) });
      const data = await res.json();
      setFollowupResult(data.result);
    } catch (err) { console.error("Follow-up suggestion failed:", err); }
    finally { setLoading(false); }
  };

  const handleClearHistory = async () => {
    try {
      await fetch(`${API_BASE_URL}/clear-interactions`, { method: "DELETE" });
      setHistory([]); setResult(null); setFollowupResult(null); setShowClearConfirm(false);
    } catch (err) { console.error("Failed to clear history:", err); }
  };

  const filteredHistory = history.filter((item) => {
    const notesMatch = item.notes?.toLowerCase().includes(search.toLowerCase());
    const summaryMatch = item.summary?.toLowerCase().includes(search.toLowerCase());
    const sentimentMatch = sentimentFilter === "all" || item.sentiment === sentimentFilter;
    return (notesMatch || summaryMatch) && sentimentMatch;
  });

  return <div className={`min-h-screen transition-all duration-300 ${darkMode ? "bg-[#020617] text-white" : "bg-[#f5f7fb] text-slate-900"}`}><div className="max-w-[1700px] mx-auto px-10 py-10 space-y-8">
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6"><div><p className={`uppercase tracking-[0.35em] text-xs mb-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>AI INTERACTION WORKSPACE</p><h1 className="text-5xl font-black tracking-tight mb-4">HCP Interaction Logging</h1><p className={`text-lg max-w-4xl leading-9 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Capture HCP meeting notes, generate AI summaries, detect sentiment, and create follow-up recommendations.</p></div><motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={handleSuggestFollowups} className="h-[56px] px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-3 shadow-xl"><WandSparkles size={20} />Suggest Follow-ups</motion.button></div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6"><div className={`xl:col-span-2 rounded-[30px] border p-8 ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}><div className="flex items-center gap-4 mb-8"><div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl"><ClipboardList size={24} /></div><div><h2 className="text-3xl font-bold">Interaction Details</h2><p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Log field notes and let AI summarize insights automatically.</p></div></div><label className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Topics Discussed / Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Example: Met Dr. Sharma, discussed Product X efficacy, positive response, requested samples..." className={`w-full mt-3 h-52 rounded-[24px] border p-5 resize-none outline-none transition-all duration-300 ${darkMode ? "bg-[#020617] border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400"}`} /><div className="flex flex-wrap gap-3 mt-6"><motion.button whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading} className="h-[56px] px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-xl disabled:opacity-60">{loading ? "Processing..." : "Log Interaction"}</motion.button><motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setNotes("Doctor was interested in Product X and asked for samples.")} className={`h-[56px] px-6 rounded-2xl border ${darkMode ? "border-white/10 bg-[#020617] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>Use Sample Note</motion.button></div>{result && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-8 rounded-[24px] border p-6 ${darkMode ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100"}`}><div className="flex items-center gap-3 mb-5"><div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center"><Sparkles size={20} /></div><div><h3 className="text-xl font-bold">AI Result</h3><p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Generated using LangGraph + Groq</p></div></div><div className="space-y-5"><div><p className="font-semibold mb-2">Status</p><p className={darkMode ? "text-slate-300" : "text-slate-700"}>{result.message || "Completed"}</p></div>{result.summary && <div><p className="font-semibold mb-2">AI Summary</p><p className={`leading-8 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{result.summary}</p></div>}{result.sentiment && <div><p className="font-semibold mb-2">Sentiment</p><span className="inline-flex px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium capitalize">{result.sentiment}</span></div>}</div></motion.div>}{followupResult && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 rounded-[24px] border p-6 ${darkMode ? "bg-purple-500/10 border-purple-500/20" : "bg-purple-50 border-purple-100"}`}><div className="flex items-center gap-3 mb-4"><WandSparkles className="text-purple-400" /><h3 className="text-xl font-bold">AI Follow-up Suggestions</h3></div><p className={`whitespace-pre-wrap leading-8 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{followupResult.suggestions || followupResult.message || "No suggestions generated."}</p></motion.div>}</div><div className={`rounded-[30px] border p-8 ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}><div className="flex items-center gap-4 mb-6"><div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white"><Brain size={24} /></div><div><h2 className="text-2xl font-bold">AI Assistant</h2><p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Smart interaction intelligence</p></div></div><div className={`rounded-[24px] p-5 border ${darkMode ? "bg-[#020617] border-white/10" : "bg-slate-50 border-slate-200"}`}><div className="flex gap-3"><MessageSquare size={18} className="text-indigo-500 mt-1" /><div><p className="font-semibold mb-2">Suggested Input</p><p className={`text-sm leading-7 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>“Doctor was interested in Product X and requested follow-up samples.”</p></div></div></div>{["AI Summarization", "Sentiment Detection", "LangGraph Agent", "Follow-up Suggestions"].map((item) => <div key={item} className={`mt-4 rounded-2xl p-5 border ${darkMode ? "bg-[#020617] border-white/10" : "bg-slate-50 border-slate-200"}`}><div className="flex items-center justify-between"><p className="font-medium">{item}</p><span className="text-emerald-400 text-sm">Active</span></div></div>)}</div></div>
    <div className={`rounded-[26px] border p-5 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}><div className="flex items-center gap-3 flex-1"><Search className="text-indigo-500" size={20} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search interactions..." className={`bg-transparent outline-none w-full ${darkMode ? "placeholder:text-slate-500 text-white" : "placeholder:text-slate-400 text-slate-900"}`} /></div><div className="flex items-center gap-3"><Filter size={18} className="text-indigo-500" />{["all", "positive", "neutral", "negative"].map((status) => <button key={status} onClick={() => setSentimentFilter(status)} className={`px-4 py-2 rounded-xl text-sm capitalize ${sentimentFilter === status ? "bg-indigo-600 text-white" : darkMode ? "bg-[#020617] text-slate-300" : "bg-slate-100 text-slate-600"}`}>{status}</button>)}</div></div>
    <div className={`rounded-[30px] border p-8 ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}><div className="flex items-center justify-between mb-8"><div><h2 className="text-4xl font-bold mb-2">Interaction History</h2><p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Search, filter, and review AI-assisted HCP interactions.</p></div><motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setShowClearConfirm(true)} className="h-[50px] px-5 rounded-2xl bg-red-500/10 text-red-400 flex items-center gap-3"><Trash2 size={18} />Clear History</motion.button></div>{filteredHistory.length === 0 ? <div className={`rounded-[24px] p-10 text-center ${darkMode ? "bg-[#020617]" : "bg-slate-50"}`}><p className={`text-lg ${darkMode ? "text-slate-400" : "text-slate-500"}`}>No interactions found.</p></div> : <div className="space-y-6">{filteredHistory.map((item, index) => <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} whileHover={{ y: -3 }} key={item.id} className={`rounded-[26px] border p-6 ${darkMode ? "bg-[#020617] border-white/10" : "bg-slate-50 border-slate-200"}`}><div className="flex items-center justify-between mb-5"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center"><Activity size={20} /></div><div><h3 className="text-xl font-bold">Interaction #{item.id}</h3><p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>AI Logged Interaction</p></div></div><span className="px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium capitalize">{item.sentiment || "neutral"}</span></div><div className="space-y-5"><div><p className={`text-sm mb-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Notes</p><p className={`leading-8 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{item.notes}</p></div><div><p className={`text-sm mb-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>AI Summary</p><p className={`leading-8 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{item.summary}</p></div></div></motion.div>)}</div>}</div>
    <AnimatePresence>{showClearConfirm && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"><motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} className={`w-full max-w-md rounded-[30px] border p-8 ${darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"}`}><div className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-6"><AlertTriangle size={26} /></div><h2 className="text-3xl font-bold mb-3">Clear All Interactions?</h2><p className={`leading-8 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>This will delete all logged interactions from your current CRM history. This action cannot be undone.</p><div className="flex justify-end gap-3 mt-8"><button onClick={() => setShowClearConfirm(false)} className="h-12 px-5 rounded-2xl bg-slate-500/10">Cancel</button><button onClick={handleClearHistory} className="h-12 px-5 rounded-2xl bg-red-600 text-white">Clear</button></div></motion.div></motion.div>}</AnimatePresence>
  </div></div>;
}

export default Interaction;
