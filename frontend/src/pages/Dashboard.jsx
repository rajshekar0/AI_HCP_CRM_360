import {
  Users,
  Activity,
  TrendingUp,
  BellRing,
  RefreshCw,
  Radio,
  Newspaper,
  Tags,
  Database,
  Server,
  BarChart3,
  Link2,
  Brain,
  Bot,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";

const EMPTY_STATS = {
  total_leads: 0,
  total_interactions: 0,
  positive_sentiment: 0,
  pending_followups: 0,
  completed_followups: 0,
  ignored_followups: 0,
  weekly_data: [],
  sentiment_data: [],
  top_tags: [],
  news: [],
};

const STATUS_COLORS = {
  green: "#16a34a",
  indigo: "#4f46e5",
  red: "#ef4444",
  amber: "#d97706",
  cyan: "#0891b2",
  violet: "#7c3aed",
  slate: "#64748b",
};

function AnimatedCounter({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const numericValue =
      typeof value === "string" ? Number(value.replace("%", "")) : Number(value);

    if (Number.isNaN(numericValue)) return;

    let start = 0;
    const increment = Math.max(1, numericValue / 40);

    const timer = setInterval(() => {
      start += increment;

      if (start >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <>
      {displayValue}
      {typeof value === "string" && value.includes("%") ? "%" : ""}
    </>
  );
}

function Dashboard({ darkMode }) {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [systemHealth, setSystemHealth] = useState({
    backend: "checking",
    database: "checking",
    dashboardStats: "checking",
    leadsApi: "checking",
    interactionsApi: "checking",
    leadIdLinking: "checking",
    aiSummary: "checking",
    sentiment: "checking",
    followUp: "checking",
    insightTags: "checking",
  });

  const safeFetchJson = async (path) => {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`);
      let data = null;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      return { ok: res.ok, data };
    } catch (error) {
      console.error(`Failed to fetch ${path}:`, error);
      return { ok: false, data: null };
    }
  };

  const getFeatureStatus = (endpointOk, records, fieldName) => {
    if (!endpointOk) return "offline";

    if (!Array.isArray(records) || records.length === 0) {
      return "active";
    }

    return records.some((item) =>
      Object.prototype.hasOwnProperty.call(item, fieldName)
    )
      ? "active"
      : "degraded";
  };

  const loadDashboard = async () => {
    setRefreshing(true);

    try {
      const [statsResult, statusResult, leadsResult, interactionsResult] =
        await Promise.all([
          safeFetchJson("/dashboard/stats"),
          safeFetchJson("/status"),
          safeFetchJson("/leads"),
          safeFetchJson("/interactions"),
        ]);

      const leadsData = Array.isArray(leadsResult.data) ? leadsResult.data : [];
      const interactionsData = Array.isArray(interactionsResult.data)
        ? interactionsResult.data
        : [];

      setStats(statsResult.ok && statsResult.data ? statsResult.data : EMPTY_STATS);
      setLeads(leadsData);

      setSystemHealth({
        backend: statusResult.ok ? "active" : "offline",
        database:
          statusResult.data?.database?.status === "connected"
            ? "active"
            : "offline",
        dashboardStats: statsResult.ok ? "active" : "offline",
        leadsApi: leadsResult.ok ? "active" : "offline",
        interactionsApi: interactionsResult.ok ? "active" : "offline",
        leadIdLinking: getFeatureStatus(
          interactionsResult.ok,
          interactionsData,
          "lead_id"
        ),
        aiSummary: getFeatureStatus(
          interactionsResult.ok,
          interactionsData,
          "summary"
        ),
        sentiment: getFeatureStatus(
          interactionsResult.ok,
          interactionsData,
          "sentiment"
        ),
        followUp: getFeatureStatus(
          interactionsResult.ok,
          interactionsData,
          "follow_up"
        ),
        insightTags: getFeatureStatus(
          interactionsResult.ok,
          interactionsData,
          "tags"
        ),
      });

      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeStats = stats || EMPTY_STATS;

  const getLocalDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const leadTrendData = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const currentDay = startOfWeek.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);

      return {
        key: getLocalDateKey(date),
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        leads: 0,
      };
    });

    const dayMap = new Map(days.map((item) => [item.key, item]));

    leads.forEach((lead) => {
      const rawDate = lead.created_at || lead.createdAt || lead.created_date;
      if (!rawDate) return;

      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return;

      const key = getLocalDateKey(date);
      if (dayMap.has(key)) {
        dayMap.get(key).leads += 1;
      }
    });

    return days;
  }, [leads]);

  const hasLeadTrendData = leadTrendData.some((item) => item.leads > 0);

  const interactionTrendData = Array.isArray(activeStats.weekly_data)
    ? activeStats.weekly_data
    : [];

  const hasInteractionTrendData = interactionTrendData.some(
    (item) => Number(item.interactions || 0) > 0
  );

  const leadStatusData = useMemo(() => {
    const counts = leads.reduce((acc, lead) => {
      const key = lead.status || "new";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: "New", value: counts.new || 0, fill: STATUS_COLORS.indigo },
      { name: "Contacted", value: counts.contacted || 0, fill: STATUS_COLORS.cyan },
      { name: "Qualified", value: counts.qualified || 0, fill: STATUS_COLORS.violet },
      { name: "Converted", value: counts.converted || 0, fill: STATUS_COLORS.green },
      { name: "Inactive", value: counts.inactive || 0, fill: STATUS_COLORS.slate },
    ];
  }, [leads]);

  const leadDesignationData = useMemo(() => {
    const counts = leads.reduce((acc, lead) => {
      const key = lead.designation || "other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: "Doctor", value: counts.doctor || 0, fill: STATUS_COLORS.indigo },
      { name: "Nurse", value: counts.nurse || 0, fill: STATUS_COLORS.cyan },
      { name: "Pharmacist", value: counts.pharmacist || 0, fill: STATUS_COLORS.green },
      { name: "Admin", value: counts.admin || 0, fill: STATUS_COLORS.amber },
      { name: "Other", value: counts.other || 0, fill: STATUS_COLORS.slate },
    ];
  }, [leads]);

  const hasLeadStatusData = leadStatusData.some((item) => item.value > 0);
  const hasLeadDesignationData = leadDesignationData.some((item) => item.value > 0);

  const followUpData = useMemo(
    () => [
      { name: "Pending", value: activeStats.pending_followups || 0, fill: STATUS_COLORS.amber },
      { name: "Completed", value: activeStats.completed_followups || 0, fill: STATUS_COLORS.green },
      { name: "Dismissed", value: activeStats.ignored_followups || 0, fill: STATUS_COLORS.red },
    ],
    [
      activeStats.pending_followups,
      activeStats.completed_followups,
      activeStats.ignored_followups,
    ]
  );

  const hasFollowUpData = followUpData.some((item) => item.value > 0);

  const sentimentData = useMemo(() => {
    const source = activeStats.sentiment_data || [];

    return source.map((item) => {
      const name = (item.name || "neutral").toLowerCase();
      if (name === "positive") return { ...item, fill: STATUS_COLORS.green };
      if (name === "negative") return { ...item, fill: STATUS_COLORS.red };
      return { ...item, fill: STATUS_COLORS.indigo };
    });
  }, [activeStats.sentiment_data]);

  const hasSentimentData = sentimentData.some((item) => item.value > 0);

  const healthItems = [
    { label: "Backend API", status: systemHealth.backend, icon: <Server size={15} /> },
    { label: "Database", status: systemHealth.database, icon: <Database size={15} /> },
    { label: "Dashboard Stats", status: systemHealth.dashboardStats, icon: <BarChart3 size={15} /> },
    { label: "Leads API", status: systemHealth.leadsApi, icon: <Users size={15} /> },
    { label: "Interactions API", status: systemHealth.interactionsApi, icon: <Activity size={15} /> },
    { label: "Lead ID Linking", status: systemHealth.leadIdLinking, icon: <Link2 size={15} /> },
    { label: "AI Summary", status: systemHealth.aiSummary, icon: <Brain size={15} /> },
    { label: "Sentiment", status: systemHealth.sentiment, icon: <TrendingUp size={15} /> },
    { label: "Follow-up", status: systemHealth.followUp, icon: <BellRing size={15} /> },
    { label: "Insight Tags", status: systemHealth.insightTags, icon: <Tags size={15} /> },
  ];

  const getServiceSignalClass = (status) => {
    if (status === "active") {
      return "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.85)] animate-pulse";
    }

    if (status === "offline") {
      return "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.75)]";
    }

    if (status === "degraded") {
      return "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.75)]";
    }

    return "bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.5)]";
  };

  const negativeSentimentValue =
    sentimentData.find((item) => item.name?.toLowerCase() === "negative")?.value || 0;
  const neutralSentimentValue =
    sentimentData.find((item) => item.name?.toLowerCase() === "neutral")?.value || 0;

  const dynamicBulletins = [
    `Total leads: ${activeStats.total_leads}`,
    `Interactions logged: ${activeStats.total_interactions}`,
    `Positive sentiment: ${activeStats.positive_sentiment}%`,
    `Neutral sentiment records: ${neutralSentimentValue}`,
    `Negative sentiment records: ${negativeSentimentValue}`,
    `Pending follow-ups: ${activeStats.pending_followups}`,
    `Completed follow-ups: ${activeStats.completed_followups || 0}`,
    `Dismissed follow-ups: ${activeStats.ignored_followups || 0}`,
    `Converted leads: ${leadStatusData.find((item) => item.name === "Converted")?.value || 0}`,
    `Inactive leads: ${leadStatusData.find((item) => item.name === "Inactive")?.value || 0}`,
    `Doctors: ${leadDesignationData.find((item) => item.name === "Doctor")?.value || 0}`,
    `Pharmacists: ${leadDesignationData.find((item) => item.name === "Pharmacist")?.value || 0}`,
  ];

  const newsItems = activeStats.news?.length
    ? [...dynamicBulletins, ...activeStats.news]
    : dynamicBulletins;

  const cards = [
    {
      title: "Total Leads",
      value: activeStats.total_leads,
      subtitle: "Stored HCP records",
      icon: <Users size={22} />,
      iconBg: "from-indigo-500 to-indigo-700",
    },
    {
      title: "Interactions",
      value: activeStats.total_interactions,
      subtitle: "Logged CRM interactions",
      icon: <Activity size={22} />,
      iconBg: "from-purple-500 to-fuchsia-700",
    },
    {
      title: "Positive Sentiment",
      value: `${activeStats.positive_sentiment}%`,
      subtitle: "AI sentiment ratio",
      icon: <TrendingUp size={22} />,
      iconBg: "from-green-600 to-emerald-700",
    },
    {
      title: "Pending Follow-ups",
      value: activeStats.pending_followups,
      subtitle: "Open next actions",
      icon: <BellRing size={22} />,
      iconBg: "from-orange-500 to-red-500",
    },
  ];

  const pieCards = [
    {
      title: "Lead Status",
      data: leadStatusData,
      hasData: hasLeadStatusData,
      emptyText: "No lead status data yet.",
    },
    {
      title: "Lead Designation",
      data: leadDesignationData,
      hasData: hasLeadDesignationData,
      emptyText: "No lead designation data yet.",
    },
    {
      title: "Sentimental",
      data: sentimentData,
      hasData: hasSentimentData,
      emptyText: "No sentiment data yet.",
    },
    {
      title: "Follow-up Pipeline",
      data: followUpData,
      hasData: hasFollowUpData,
      emptyText: "No follow-up pipeline data yet.",
    },
  ];

  if (!stats) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? "bg-[#020617] text-white" : "bg-[#f5f7fb] text-slate-900"
        }`}
      >
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        darkMode ? "bg-[#020617] text-white" : "bg-[#f5f7fb] text-slate-900"
      }`}
    >
      <style>{`
        @keyframes newsTicker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .news-track{animation:newsTicker 28s linear infinite}
        .health-track{animation:newsTicker 34s linear infinite}
        .tag-track{animation:newsTicker 24s linear infinite}
        .news-track:hover,.health-track:hover,.tag-track:hover{animation-play-state:paused}
        .dashboard-donut,
        .dashboard-donut *,
        .dashboard-donut svg,
        .dashboard-donut path,
        .dashboard-donut .recharts-wrapper,
        .dashboard-donut .recharts-surface,
        .dashboard-donut .recharts-sector {
          outline: none !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
      `}</style>

      <div className="max-w-[1700px] mx-auto px-10 py-10 space-y-8">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div>
            <p
             className={`uppercase tracking-[0.35em] text-sm font-black mb-4 ${
             darkMode ? "text-slate-400" : "text-slate-500"
              }`}
                >
             AI HCP-CRM 360 PLATFORM
              </p>

<h1 className="text-5xl font-black tracking-tight">
   Dashboard Workspace
</h1>
          </div>

          <div
            className={`rounded-[24px] border px-5 py-4 min-w-[260px] ${
              darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Radio className="text-emerald-400" size={20} />
                </div>
                <div>
                  <p className="font-semibold">Live</p>
                  <p
                    className={`text-sm ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Last updated: {lastUpdated || "Checking..."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadDashboard}
                title="Refresh dashboard"
                className={`h-11 w-11 rounded-2xl border flex items-center justify-center transition ${
                  darkMode
                    ? "bg-[#020617] border-white/10 text-slate-300 hover:border-indigo-500/50 hover:text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-slate-900"
                }`}
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>

        <TickerBlock
          darkMode={darkMode}
          label="Live Bulletin"
          icon={<Newspaper size={19} />}
          labelClass="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        >
          <div className="news-track flex whitespace-nowrap">
            {[...newsItems, ...newsItems].map((item, index) => (
              <div
                key={index}
                className={`px-8 py-4 text-sm ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                <span className="text-indigo-500 mr-3">●</span>
                {item}
              </div>
            ))}
          </div>
        </TickerBlock>

        <TickerBlock
          darkMode={darkMode}
          label="AI Tools Health"
          icon={<Bot size={20} />}
          labelClass={
            darkMode
              ? "bg-green-700/20 text-green-300 border-r border-green-500/25 backdrop-blur-md"
              : "bg-green-50 text-green-700 border-r border-green-200"
          }
        >
          <div className="health-track flex whitespace-nowrap py-3">
            {[...healthItems, ...healthItems].map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className={`mx-2 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                  darkMode
                    ? "bg-[#020617] border-white/10"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className={darkMode ? "text-slate-500" : "text-slate-400"}>
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
                <span
                  title={item.status}
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${getServiceSignalClass(
                    item.status
                  )}`}
                />
              </div>
            ))}
          </div>
        </TickerBlock>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {cards.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -5 }}
              className={`rounded-[26px] border p-6 transition-all duration-300 ${
                darkMode
                  ? "bg-[#081028] border-white/10"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div
                  className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${item.iconBg} flex items-center justify-center text-white shadow-lg`}
                >
                  {item.icon}
                </div>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Radio size={15} />
                </span>
              </div>

              <p
                className={`text-base mb-2 ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {item.title}
              </p>
              <h2 className="text-5xl font-black">
                <AnimatedCounter value={item.value} />
              </h2>
              <div
                className={`mt-5 text-xs ${
                  darkMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {item.subtitle}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
          <TrendCard
            title="Lead Analysis"
            subtitle="Current-week lead creation count."
            darkMode={darkMode}
          >
            {hasLeadTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadTrendData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STATUS_COLORS.green} stopOpacity={0.75} />
                      <stop offset="95%" stopColor={STATUS_COLORS.green} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke={darkMode ? "#94a3b8" : "#64748b"} />
                  <YAxis allowDecimals={false} stroke={darkMode ? "#94a3b8" : "#64748b"} />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke={STATUS_COLORS.green}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorLeads)"
                    isAnimationActive
                    animationDuration={2200}
                    animationEasing="ease-out"
                    activeDot={(props) => (
                      <GraphActiveDot
                        {...props}
                        metricLabel="Leads"
                        metricKey="leads"
                        color={STATUS_COLORS.green}
                      />
                    )}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartMessage darkMode={darkMode}>
                Lead analysis will appear when lead records include creation timestamps.
              </EmptyChartMessage>
            )}
          </TrendCard>

          <TrendCard
            title="Interaction Analysis"
            subtitle="Current-week CRM interaction volume."
            darkMode={darkMode}
          >
            {hasInteractionTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={interactionTrendData}>
                  <defs>
                    <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke={darkMode ? "#94a3b8" : "#64748b"} />
                  <YAxis allowDecimals={false} stroke={darkMode ? "#94a3b8" : "#64748b"} />
                  <Area
                    type="monotone"
                    dataKey="interactions"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorInteractions)"
                    isAnimationActive
                    animationDuration={2200}
                    animationEasing="ease-out"
                    activeDot={(props) => (
                      <GraphActiveDot
                        {...props}
                        metricLabel="Interactions"
                        metricKey="interactions"
                        color="#6366f1"
                      />
                    )}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartMessage darkMode={darkMode}>
                Interaction analysis will appear after CRM interactions are logged.
              </EmptyChartMessage>
            )}
          </TrendCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {pieCards.map((card) => (
            <PieOnlyCard key={card.title} {...card} darkMode={darkMode} />
          ))}
        </div>

        <TickerBlock
          darkMode={darkMode}
          label="Top CRM Tags"
          icon={<Tags size={19} />}
          labelClass="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        >
          {activeStats.top_tags?.length ? (
            <div className="tag-track flex whitespace-nowrap py-3">
              {[...activeStats.top_tags, ...activeStats.top_tags].map((item, index) => (
                <div
                  key={`${item.tag}-${index}`}
                  className={`mx-2 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                    darkMode
                      ? "bg-[#020617] text-indigo-300 border-indigo-500/20"
                      : "bg-indigo-50 text-indigo-700 border-indigo-100"
                  }`}
                >
                  <Tags size={13} />
                  {formatTagLabel(item.tag)}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      darkMode ? "bg-white/10" : "bg-white"
                    }`}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`px-8 py-4 text-sm ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              No tags yet. Log an interaction to activate AI tagging.
            </div>
          )}
        </TickerBlock>
      </div>
    </div>
  );
}

function TickerBlock({ darkMode, label, icon, labelClass, children }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className={`rounded-[26px] border overflow-hidden ${
        darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center">
        <div
          className={`shrink-0 px-6 py-4 flex items-center gap-3 font-semibold ${labelClass}`}
        >
          {icon}
          {label}
        </div>
        <div className="overflow-hidden flex-1">{children}</div>
      </div>
    </motion.div>
  );
}

function PieOnlyCard({ title, darkMode, data, hasData, emptyText }) {
  const [hovered, setHovered] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(event) => event.preventDefault()}
      onDoubleClick={(event) => event.preventDefault()}
      className={`dashboard-donut rounded-[28px] border p-5 min-h-[315px] select-none ${
        darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <PieChartIcon size={19} />
        </div>
        <h2
          className={`text-base font-semibold ${
            darkMode ? "text-slate-300" : "text-slate-700"
          }`}
        >
          {title}
        </h2>
      </div>

      <div className="h-[190px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ outline: "none", userSelect: "none" }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
                activeIndex={activeIndex ?? undefined}
                activeShape={renderActivePieShape}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                isAnimationActive
                animationDuration={2200}
                animationEasing="ease-out"
                stroke="transparent"
                onMouseLeave={() => {
                  setHovered(null);
                  setActiveIndex(null);
                }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name || index}
                    fill={entry.fill}
                    stroke="transparent"
                    onMouseEnter={() => {
                      setHovered(entry);
                      setActiveIndex(index);
                    }}
                    style={{
                      outline: "none",
                      cursor: "default",
                      userSelect: "none",
                      transition: "all 0.35s ease",
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartMessage darkMode={darkMode}>{emptyText}</EmptyChartMessage>
        )}
      </div>

      <div className="h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {hovered ? (
            <motion.div
              key={`${hovered.name}-${hovered.value}`}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`rounded-full border px-4 py-2 text-sm shadow-xl ${
                darkMode
                  ? "bg-[#020617] border-indigo-500/30 text-white"
                  : "bg-white border-indigo-200 text-slate-700"
              }`}
            >
              <span className="font-semibold">{hovered.name}</span>
              <span className={darkMode ? "mx-2 text-slate-500" : "mx-2 text-slate-400"}>
                •
              </span>
              <span>{hovered.value}</span>
            </motion.div>
          ) : (
            <motion.span
              key="empty-hover-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={darkMode ? "text-xs text-slate-600" : "text-xs text-slate-400"}
            >
              Hover chart for details
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function renderActivePieShape(props) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
      />

      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 9}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.28}
      />
    </g>
  );
}

function TrendCard({ title, subtitle, darkMode, children }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className={`rounded-[28px] border p-6 min-h-[390px] ${
        darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"
      }`}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          {subtitle}
        </p>
      </div>
      <div className="h-[260px]">{children}</div>
    </motion.div>
  );
}

function GraphActiveDot({ cx, cy, payload, value, metricLabel, metricKey, color }) {
  const displayValue = payload?.[metricKey] ?? value ?? 0;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill={color}
        stroke="#ffffff"
        strokeWidth={2}
      />

      <foreignObject x={cx + 12} y={cy - 31} width={170} height={42}>
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="inline-flex items-center rounded-full border border-indigo-500/30 bg-[#020617]/95 px-3 py-1.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md"
        >
          <span>{metricLabel}</span>
          <span className="mx-2 text-slate-500">•</span>
          <span>{displayValue}</span>
        </motion.div>
      </foreignObject>
    </g>
  );
}

function EmptyChartMessage({ children, darkMode }) {
  return (
    <div
      className={`h-full rounded-2xl border flex items-center justify-center text-center px-6 text-sm ${
        darkMode
          ? "bg-[#020617] border-white/10 text-slate-400"
          : "bg-slate-50 border-slate-200 text-slate-500"
      }`}
    >
      {children}
    </div>
  );
}

function formatTagLabel(tag) {
  return String(tag || "")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export default Dashboard;
