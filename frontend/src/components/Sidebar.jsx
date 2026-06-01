import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Bot,
  ClipboardList,
  Sparkles,
  Moon,
  Sun,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Sidebar({ darkMode, setDarkMode }) {
  const [engineStatus, setEngineStatus] = useState("checking");

  const API_BASE_URL = useMemo(() => {
    return import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkBackendHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!isMounted) return;

        setEngineStatus(response.ok ? "online" : "offline");
      } catch {
        if (!isMounted) return;
        setEngineStatus("offline");
      }
    };

    checkBackendHealth();
    const intervalId = setInterval(checkBackendHealth, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [API_BASE_URL]);

  const statusSignalClass =
    engineStatus === "online"
      ? "bg-emerald-400 shadow-emerald-400/40"
      : engineStatus === "checking"
      ? "bg-amber-400 shadow-amber-400/40"
      : "bg-rose-400 shadow-rose-400/40";

  const menu = [
    {
      name: "Dashboard",
      path: "/",
      icon: <LayoutDashboard size={20} />,
      desc: "360 CRM overview",
    },
    {
      name: "Leads",
      path: "/leads",
      icon: <Users size={20} />,
      desc: "HCP records",
    },
    {
      name: "AI Copilot",
      path: "/chat",
      icon: <Bot size={20} />,
      desc: "AI CRM assistant",
    },
    {
      name: "Interactions",
      path: "/interaction",
      icon: <ClipboardList size={20} />,
      desc: "HCP activity logs",
    },
  ];

  return (
    <aside
      className={`w-[320px] h-full border-r flex flex-col overflow-hidden transition-all duration-300 ${
        darkMode
          ? "bg-[#070b1d] border-white/10"
          : "bg-[#f8fafc] border-slate-200"
      }`}
    >
      {/* Brand Card */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div
          className={`rounded-[28px] border p-5 transition-all duration-300 ${
            darkMode
              ? "bg-[#0f1631] border-white/10 shadow-2xl shadow-black/20"
              : "bg-white border-slate-200 shadow-xl shadow-slate-200/70"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-[60px] w-[60px] rounded-[22px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-indigo-500/25 shrink-0">
              <Sparkles className="text-white" size={30} />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-[20.5px] font-black leading-none tracking-[-0.055em] bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent whitespace-nowrap">
                AI HCP-CRM 360
              </h1>

              <p
                className={`mt-2 text-[13px] font-extrabold leading-none tracking-[-0.02em] whitespace-nowrap ${
                  darkMode ? "text-slate-100" : "text-slate-800"
                }`}
              >
                AI-Management Platform
              </p>

              
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <div
              className={`h-[36px] flex-1 flex items-center justify-center gap-2 rounded-full px-3 border backdrop-blur-xl whitespace-nowrap overflow-hidden ${
                darkMode
                  ? "bg-white/5 border-white/10 text-indigo-100"
                  : "bg-indigo-50/80 border-indigo-100 text-indigo-700"
              }`}
            >
              <ShieldCheck size={13} className="shrink-0" />
              <span className="text-[9.2px] font-black uppercase tracking-[0.13em] whitespace-nowrap">
                Life Sciences CRM
              </span>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle theme"
              className={`h-[36px] w-[44px] rounded-full border flex items-center justify-center backdrop-blur-xl transition-all duration-300 shrink-0 ${
                darkMode
                  ? "bg-white/[0.08] border-white/10 hover:bg-white/[0.12]"
                  : "bg-white/80 border-slate-200 hover:bg-indigo-50"
              }`}
            >
              {darkMode ? (
                <Moon size={16} className="text-indigo-200" />
              ) : (
                <Sun size={16} className="text-yellow-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* LangGraph Status */}
      <div className="px-4 mt-1 shrink-0">
        <div
          className={`rounded-[22px] border px-4 py-3.5 flex items-center justify-between transition-all duration-300 ${
            darkMode
              ? "bg-[#0f1631] border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-10 w-10 rounded-[16px] bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Activity size={18} className="text-emerald-400" />
            </div>

            <div className="min-w-0">
              <p
                className={`text-[14px] font-bold leading-tight ${
                  darkMode ? "text-white" : "text-slate-900"
                }`}
              >
                LangGraph 1.1.10
              </p>
              <p
                className={`mt-0.5 text-[11.5px] ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Groq LLM connected
              </p>
            </div>
          </div>

          <div
            className={`h-3.5 w-3.5 rounded-full shadow-lg transition-all duration-300 ${
              statusSignalClass
            } ${engineStatus === "online" ? "animate-pulse" : ""}`}
            title={`Backend status: ${engineStatus}`}
          />
        </div>
      </div>

      {/* Workspace Menu */}
      <nav className="px-4 mt-5 shrink-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p
            className={`text-[10px] uppercase tracking-[0.34em] ${
              darkMode ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Workspace 360
          </p>

          <span
            className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
              darkMode
                ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
                : "border-indigo-100 bg-indigo-50 text-indigo-700"
            }`}
          >
            AI CRM
          </span>
        </div>

        <div className="space-y-2.5">
          {menu.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `group h-[61px] rounded-[19px] border px-3.5 flex items-center gap-3 transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-transparent shadow-xl shadow-indigo-500/25"
                    : darkMode
                    ? "bg-[#0f1631] text-slate-300 border-white/10 hover:border-indigo-500/40 hover:bg-[#131b3a]"
                    : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                }`
              }
            >
              <div
                className={`h-10 w-10 rounded-[15px] flex items-center justify-center shrink-0 transition-all duration-300 ${
                  darkMode
                    ? "bg-white/5 group-hover:bg-indigo-500/20"
                    : "bg-slate-100 group-hover:bg-white"
                } group-hover:scale-105`}
              >
                {item.icon}
              </div>

              <div className="min-w-0">
                <span className="block text-[13.5px] font-bold leading-tight">
                  {item.name}
                </span>
                <span className="block mt-0.5 text-[11px] font-medium opacity-65 leading-tight">
                  {item.desc}
                </span>
              </div>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="flex-1" />

      {/* Release Capsule */}
      <div className="px-4 pb-4 shrink-0">
        <div
          className={`h-[34px] rounded-full border px-3.5 flex items-center justify-between ${
            darkMode
              ? "bg-[#0f1631] border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <p
            className={`text-[9.5px] font-bold uppercase tracking-[0.18em] ${
              darkMode ? "text-slate-500" : "text-slate-500"
            }`}
          >
            Release
          </p>
          <span
            className={`text-[10px] font-black ${
              darkMode ? "text-indigo-300" : "text-indigo-600"
            }`}
          >
            360 v2 Upgrade
          </span>
        </div>
      </div>
    </aside>
  );
}
