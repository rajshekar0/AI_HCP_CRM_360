import { LayoutDashboard, Users, Bot, ClipboardList, Sparkles, Moon, Sun, Activity } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Sidebar({ darkMode, setDarkMode }) {
  const menu = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={22} /> },
    { name: "Leads", path: "/leads", icon: <Users size={22} /> },
    { name: "AI", path: "/chat", icon: <Bot size={22} /> },
    { name: "Logs", path: "/interaction", icon: <ClipboardList size={22} /> },
  ];

  return (
    <div className={`w-[320px] h-full border-r flex flex-col transition-all duration-300 ${darkMode ? "bg-[#070b1d] border-white/10" : "bg-[#f8fafc] border-slate-200"}`}>
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-[26px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shrink-0">
            <Sparkles className="text-white" size={36} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[46px] font-black leading-[0.88] tracking-tight text-indigo-500 whitespace-nowrap">AI CRM</h1>
            <p className={`mt-2 text-[14px] leading-6 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>AI-first HCP platform</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setDarkMode(!darkMode)} className="relative w-[68px] h-[36px] rounded-full bg-indigo-500 transition-all duration-300 shrink-0">
            <div className={`absolute top-[4px] h-[28px] w-[28px] rounded-full bg-white flex items-center justify-center shadow-md transition-all duration-300 ${darkMode ? "left-[36px]" : "left-[4px]"}`}>
              {darkMode ? <Moon size={14} className="text-slate-700" /> : <Sun size={14} className="text-yellow-500" />}
            </div>
          </button>
        </div>
      </div>

      <div className="px-5 shrink-0">
        <div className={`rounded-[24px] p-5 border transition-all duration-300 ${darkMode ? "bg-[#0f1631] border-white/10" : "bg-white border-slate-200"}`}>
          <h2 className={`text-[28px] font-bold leading-tight ${darkMode ? "text-white" : "text-slate-900"}`}>AI-native CRM</h2>
          <p className={`mt-3 text-[14px] leading-7 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Manage HCP leads, interaction notes, AI summaries, sentiment, and follow-ups from one intelligent workspace.</p>
        </div>
      </div>

      <div className="px-5 mt-6 shrink-0">
        <p className={`text-[10px] uppercase tracking-[0.35em] mb-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Workspace</p>
        <div className="grid grid-cols-2 gap-3">
          {menu.map((item) => (
            <NavLink key={item.name} to={item.path} className={({ isActive }) => `group h-[96px] rounded-[22px] border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${isActive ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-transparent shadow-xl" : darkMode ? "bg-[#0f1631] text-slate-300 border-white/10 hover:border-indigo-500/40 hover:bg-[#131b3a]" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"}`}>
              <div className="group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
              <span className="text-sm font-semibold">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex-1" />
      <div className="p-5 shrink-0">
        <div className={`rounded-2xl border p-4 flex items-center justify-between transition-all duration-300 ${darkMode ? "bg-[#0f1631] border-white/10" : "bg-white border-slate-200"}`}>
          <div className="flex items-center gap-3">
            <Activity size={17} className="text-green-400" />
            <div>
              <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>LangGraph Active</p>
              <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Groq connected</p>
            </div>
          </div>
          <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
