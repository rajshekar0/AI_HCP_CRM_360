import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Sparkles,
  Activity,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Tags,
  ChevronDown,
  Check,
  UserRound,
  Link2,
  FileText,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../config";

const FOLLOW_UP_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "ignored", label: "Dismissed" },
];

const SENTIMENT_FILTERS = [
  { value: "all", label: "All Sentiments" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

function formatTagLabel(tag) {
  return String(tag || "")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function Interaction({ darkMode }) {
  const leadDropdownRef = useRef(null);
  const sentimentDropdownRef = useRef(null);

  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [leadDropdownOpen, setLeadDropdownOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [sentimentDropdownOpen, setSentimentDropdownOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [openStatusMenu, setOpenStatusMenu] = useState(null);
  const [selectedInteractionId, setSelectedInteractionId] = useState(null);

  useEffect(() => {
    fetchHistory();
    fetchLeads();

    const handleOutsideClick = (event) => {
      const target = event.target;

      if (leadDropdownRef.current && !leadDropdownRef.current.contains(target)) {
        setLeadDropdownOpen(false);
      }

      if (
        sentimentDropdownRef.current &&
        !sentimentDropdownRef.current.contains(target)
      ) {
        setSentimentDropdownOpen(false);
      }

      if (!target.closest?.("[data-status-dropdown]")) {
        setOpenStatusMenu(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setLeadDropdownOpen(false);
        setSentimentDropdownOpen(false);
        setOpenStatusMenu(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/interactions`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      setHistory(items);

      if (!selectedInteractionId && items.length > 0) {
        setSelectedInteractionId(items[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch interactions:", err);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/leads`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    }
  };

  const getApiError = async (res) => {
    try {
      const data = await res.json();
      return data?.detail || data?.error || data?.message || "Request failed";
    } catch {
      return "Request failed";
    }
  };

  const selectedLead = useMemo(() => {
    return leads.find((lead) => String(lead.id) === String(selectedLeadId));
  }, [leads, selectedLeadId]);

  const filteredLeads = useMemo(() => {
    const q = leadSearch.toLowerCase().trim();

    if (!q) return leads;

    return leads.filter((lead) => {
      return (
        String(lead.id).includes(q) ||
        lead.name?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q) ||
        lead.phone?.toLowerCase().includes(q)
      );
    });
  }, [leads, leadSearch]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const q = search.toLowerCase().trim();
      const idQuery = q.replace("#", "");

      const textMatch =
        !q ||
        String(item.id || "").includes(idQuery) ||
        item.notes?.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q) ||
        item.follow_up?.toLowerCase().includes(q) ||
        item.tags?.toLowerCase().includes(q) ||
        String(item.lead_id || "").includes(idQuery) ||
        item.lead_name?.toLowerCase().includes(q) ||
        item.lead_email?.toLowerCase().includes(q) ||
        item.lead_phone?.toLowerCase().includes(q);

      const sentimentMatch =
        sentimentFilter === "all" || item.sentiment === sentimentFilter;

      return textMatch && sentimentMatch;
    });
  }, [history, search, sentimentFilter]);

  const selectedInteraction = useMemo(() => {
    if (!filteredHistory.length) return null;

    return (
      filteredHistory.find(
        (item) => String(item.id) === String(selectedInteractionId)
      ) || filteredHistory[0]
    );
  }, [filteredHistory, selectedInteractionId]);

  useEffect(() => {
    if (!filteredHistory.length) {
      setSelectedInteractionId(null);
      return;
    }

    const selectedStillVisible = filteredHistory.some(
      (item) => String(item.id) === String(selectedInteractionId)
    );

    if (!selectedStillVisible) {
      setSelectedInteractionId(filteredHistory[0].id);
    }
  }, [filteredHistory, selectedInteractionId]);

  const handleSubmit = async () => {
    if (!selectedLeadId) {
      setResult({
        message: "Interaction logging failed",
        error: "Please select a specific lead before logging an interaction.",
      });
      return;
    }

    if (!notes.trim()) {
      setResult({
        message: "Interaction logging failed",
        error: "Interaction notes are required.",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/interactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: Number(selectedLeadId),
          notes,
        }),
      });

      if (!res.ok) {
        throw new Error(await getApiError(res));
      }

      const data = await res.json();
      setResult(data);

      if (data?.saved !== false && !data?.error) {
        setNotes("");
        if (data?.interaction_id) {
          setSelectedInteractionId(data.interaction_id);
        }
      }

      fetchHistory();
    } catch (err) {
      console.error("Interaction submit failed:", err);
      setResult({
        message: "Interaction logging failed",
        error: err.message || "Unable to log interaction",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch(`${API_BASE_URL}/clear-interactions`, {
        method: "DELETE",
      });

      setHistory([]);
      setSelectedInteractionId(null);
      setResult(null);
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const updateFollowUpStatus = async (interactionId, status) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/interactions/${interactionId}/follow-up-status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!res.ok) {
        throw new Error(await getApiError(res));
      }

      setHistory((prev) =>
        prev.map((item) =>
          item.id === interactionId
            ? {
                ...item,
                follow_up_status: status,
              }
            : item
        )
      );

      setOpenStatusMenu(null);
    } catch (error) {
      console.error("Follow-up status update failed:", error);
    }
  };

  const parseTags = (tagString) => {
    if (!tagString) return [];

    return String(tagString)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  };

  const getFollowUpStatusLabel = (status) => {
    return (
      FOLLOW_UP_STATUSES.find((item) => item.value === status)?.label ||
      "Pending"
    );
  };

  const getSentimentFilterLabel = () => {
    return (
      SENTIMENT_FILTERS.find((item) => item.value === sentimentFilter)?.label ||
      "All Sentiments"
    );
  };

  const getSentimentClass = (sentiment) => {
    const value = (sentiment || "neutral").toLowerCase();

    if (value === "positive") {
      return darkMode
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
        : "bg-emerald-50 text-emerald-700 border-emerald-100";
    }

    if (value === "negative") {
      return darkMode
        ? "bg-rose-500/15 text-rose-300 border-rose-500/25"
        : "bg-rose-50 text-rose-700 border-rose-100";
    }

    return darkMode
      ? "bg-slate-500/15 text-slate-300 border-slate-500/25"
      : "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getFollowUpStatusClass = (status) => {
    const value = (status || "pending").toLowerCase();

    if (value === "completed") {
      return darkMode
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20"
        : "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100";
    }

    if (value === "ignored") {
      return darkMode
        ? "bg-rose-500/15 text-rose-300 border-rose-500/25 hover:bg-rose-500/20"
        : "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100";
    }

    return darkMode
      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/25 hover:bg-indigo-500/20"
      : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100";
  };

  const noteWordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        darkMode ? "bg-[#020617] text-white" : "bg-[#f5f7fb] text-slate-900"
      }`}
    >
      <div className="max-w-[1700px] mx-auto px-10 py-10 space-y-8">
        <div>
          <p
            className={`uppercase tracking-[0.35em] text-sm font-black mb-4 ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            AI HCP-CRM 360 INTERACTION WORKSPACE
          </p>

          <h1 className="text-5xl font-black tracking-tight mb-4">
            Interactions 
          </h1>

          <p
            className={`text-lg max-w-4xl leading-9 ${
              darkMode ? "text-slate-400" : "text-slate-600"
            }`}
          >
            CRM-HCP Management workspace for logging field conversations,
            generating AI summaries, detecting sentiment, planning follow-ups,
            and maintaining complete HCP relationship intelligence.
          </p>
        </div>

        <div
          className={`rounded-[30px] border overflow-hidden ${
            darkMode
              ? "bg-[#081028] border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`px-8 py-6 border-b ${
              darkMode ? "border-white/10" : "border-slate-200"
            }`}
          >
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl">
                  <ClipboardList size={24} />
                </div>

                <div>
                  <h2 className="text-3xl font-bold">Log Interaction</h2>
                  <p
                    className={`text-sm mt-1 ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Save one verified field note against one specific AI HCP-CRM 360 lead.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoPill
                  darkMode={darkMode}
                  icon={<Link2 size={14} />}
                  label="Lead-linked"
                />
                <InfoPill
                  darkMode={darkMode}
                  icon={<Sparkles size={14} />}
                  label="AI-enriched"
                />
                <InfoPill
                  darkMode={darkMode}
                  icon={<Tags size={14} />}
                  label="CRM-tagged"
                />
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-5">
                <label
                  className={`text-sm font-medium ${
                    darkMode ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  Select HCP Lead
                </label>

                <div className="relative mt-3" ref={leadDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setLeadDropdownOpen((prev) => !prev)}
                    className={`w-full min-h-16 rounded-2xl border px-5 py-4 outline-none transition-all flex items-center justify-between gap-4 text-left ${
                      darkMode
                        ? "bg-[#020617] border-white/10 text-white hover:border-indigo-500/60"
                        : "bg-slate-50 border-slate-200 text-slate-900 hover:border-indigo-400"
                    } ${
                      leadDropdownOpen
                        ? "ring-2 ring-indigo-500/30 border-indigo-500"
                        : ""
                    }`}
                  >
                    <div>
                      <p className={darkMode ? "text-slate-300" : "text-slate-600"}>
                        {selectedLead ? "Change selected lead" : "Choose a lead"}
                      </p>
                      <p
                        className={`text-sm mt-1 ${
                          darkMode ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        Search by ID, name, email, or phone
                      </p>
                    </div>

                    <ChevronDown
                      size={20}
                      className={`shrink-0 transition-transform ${
                        leadDropdownOpen ? "rotate-180" : ""
                      } ${darkMode ? "text-slate-400" : "text-slate-500"}`}
                    />
                  </button>

                  <AnimatePresence>
                    {leadDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute z-50 mt-3 w-full rounded-[24px] border shadow-2xl overflow-hidden ${
                          darkMode
                            ? "bg-[#020617] border-white/10"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div
                          className={`p-4 border-b ${
                            darkMode ? "border-white/10" : "border-slate-200"
                          }`}
                        >
                          <div
                            className={`h-12 rounded-2xl px-4 flex items-center gap-3 ${
                              darkMode ? "bg-[#081028]" : "bg-slate-50"
                            }`}
                          >
                            <Search size={18} className="text-indigo-500" />
                            <input
                              value={leadSearch}
                              onChange={(e) => setLeadSearch(e.target.value)}
                              placeholder="Search lead..."
                              className={`bg-transparent outline-none w-full ${
                                darkMode
                                  ? "text-white placeholder:text-slate-500"
                                  : "text-slate-900 placeholder:text-slate-400"
                              }`}
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto p-2 custom-scrollbar">
                          {filteredLeads.length === 0 ? (
                            <div
                              className={`p-5 text-center text-sm ${
                                darkMode ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              No matching leads found.
                            </div>
                          ) : (
                            filteredLeads.map((lead) => {
                              const active = String(selectedLeadId) === String(lead.id);

                              return (
                                <button
                                  key={lead.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedLeadId(String(lead.id));
                                    setLeadDropdownOpen(false);
                                    setLeadSearch("");
                                  }}
                                  className={`w-full rounded-2xl p-4 text-left flex items-center justify-between gap-4 transition-all ${
                                    active
                                      ? darkMode
                                        ? "bg-indigo-500/15 border border-indigo-500/30"
                                        : "bg-indigo-50 border border-indigo-100"
                                      : darkMode
                                      ? "hover:bg-white/5 border border-transparent"
                                      : "hover:bg-slate-50 border border-transparent"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="font-semibold truncate">
                                      ID {lead.id} · {lead.name}
                                    </p>
                                    <p
                                      className={`text-sm mt-1 truncate ${
                                        darkMode ? "text-slate-400" : "text-slate-500"
                                      }`}
                                    >
                                      {lead.email || "No email"} ·{" "}
                                      {lead.phone || "No phone"}
                                    </p>
                                  </div>

                                  {active && (
                                    <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                      <Check size={16} />
                                    </div>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {selectedLead ? (
                  <div
                    className={`mt-4 rounded-2xl border p-4 flex items-start gap-3 ${
                      darkMode
                        ? "bg-[#020617] border-white/10"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <UserRound size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        Lead ID {selectedLead.id} · {selectedLead.name}
                      </p>
                      <p
                        className={`text-sm mt-1 truncate ${
                          darkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {selectedLead.email || "No email"} ·{" "}
                        {selectedLead.phone || "No phone"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`mt-4 rounded-2xl border p-4 ${
                      darkMode
                        ? "bg-[#020617] border-white/10 text-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    Selected lead will appear here as a dedicated linked record.
                  </div>
                )}
              </div>

              <div className="xl:col-span-7">
                <div className="flex items-center justify-between gap-4">
                  <label
                    className={`text-sm font-medium ${
                      darkMode ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Interaction Notes
                  </label>
                  <span
                    className={`text-xs ${
                      darkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {noteWordCount} words
                  </span>
                </div>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Example: Discussed product efficacy, patient suitability, concerns, samples, pricing, or next visit plan..."
                  className={`w-full mt-3 h-72 rounded-[24px] border p-5 resize-none outline-none transition-all duration-300 ${
                    darkMode
                      ? "bg-[#020617] border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400"
                  }`}
                />

                <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p
                    className={`text-sm ${
                      darkMode ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    AI HCP-CRM 360 will generate summary, sentiment, suggested follow-up, and CRM tags.
                  </p>

                  <motion.button
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={loading}
                    className="h-[54px] px-7 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-xl disabled:opacity-60 shrink-0"
                  >
                    {loading ? "Processing..." : "Log Interaction"}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-8 mx-8 mb-8 rounded-[24px] border p-6 ${
                result.error
                  ? darkMode
                    ? "bg-rose-500/10 border-rose-500/20"
                    : "bg-rose-50 border-rose-100"
                  : darkMode
                  ? "bg-indigo-500/10 border-indigo-500/20"
                  : "bg-indigo-50 border-indigo-100"
              }`}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center">
                  <Sparkles size={20} />
                </div>

                <div>
                  <h3 className="text-xl font-bold">AI Result</h3>
                  <p
                    className={`text-sm ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Generated using LangGraph + Groq
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <InfoBlock
                  label="Status"
                  value={result.error || result.message || "Completed"}
                  darkMode={darkMode}
                />

                {result.lead_id && (
                  <InfoBlock
                    label="Linked Lead"
                    value={`Lead ID: ${result.lead_id}\nName: ${result.lead_name || "—"}\n${
                      result.lead_email || "No email"
                    } · ${result.lead_phone || "No phone"}`}
                    darkMode={darkMode}
                  />
                )}

                {result.summary && (
                  <InfoBlock label="AI Summary" value={result.summary} darkMode={darkMode} />
                )}

                {result.follow_up && (
                  <InfoBlock
                    label="Suggested Follow-up"
                    value={result.follow_up}
                    darkMode={darkMode}
                  />
                )}

                {result.sentiment && (
                  <div>
                    <p className="font-semibold mb-2">Sentiment</p>
                    <span
                      className={`inline-flex px-4 py-2 rounded-full border text-sm font-medium capitalize ${getSentimentClass(
                        result.sentiment
                      )}`}
                    >
                      {result.sentiment}
                    </span>
                  </div>
                )}

                {result.tags && (
                  <div>
                    <p className="font-semibold mb-2">CRM Insight Tags</p>
                    <TagList tags={parseTags(result.tags)} darkMode={darkMode} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div
          className={`rounded-[26px] border p-5 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between ${
            darkMode
              ? "bg-[#081028] border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3 flex-1">
            <Search className="text-indigo-500" size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search interaction ID, lead ID, lead name, notes, summaries, follow-ups, or CRM tags..."
              className={`bg-transparent outline-none w-full ${
                darkMode
                  ? "placeholder:text-slate-500 text-white"
                  : "placeholder:text-slate-400 text-slate-900"
              }`}
            />
          </div>

          <div className="relative" ref={sentimentDropdownRef}>
            <button
              type="button"
              onClick={() => setSentimentDropdownOpen((prev) => !prev)}
              className={`h-11 px-4 rounded-2xl border flex items-center gap-3 text-sm font-medium ${
                darkMode
                  ? "bg-[#020617] border-white/10 text-slate-300 hover:border-indigo-500/40"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-400"
              }`}
            >
              <Filter size={17} className="text-indigo-500" />
              {getSentimentFilterLabel()}
              <ChevronDown
                size={15}
                className={`transition-transform ${
                  sentimentDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {sentimentDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 mt-2 w-48 rounded-2xl border p-2 shadow-2xl z-50 ${
                    darkMode
                      ? "bg-[#020617] border-white/10"
                      : "bg-white border-slate-200"
                  }`}
                >
                  {SENTIMENT_FILTERS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setSentimentFilter(item.value);
                        setSentimentDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                        sentimentFilter === item.value
                          ? "bg-indigo-600 text-white"
                          : darkMode
                          ? "text-slate-300 hover:bg-white/5"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div
          className={`rounded-[30px] border p-8 ${
            darkMode
              ? "bg-[#081028] border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-4xl font-bold mb-2">Interaction History</h2>
              <p
                className={`text-sm ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Select an interaction from the list to inspect full notes, AI output, tags, and follow-up status.
              </p>
              <p
                className={`text-xs mt-2 ${
                  darkMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Showing {filteredHistory.length} of {history.length} interactions
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowClearConfirm(true)}
              className="h-[50px] px-5 rounded-2xl bg-red-500/10 text-red-400 flex items-center gap-3"
            >
              <Trash2 size={18} />
              Clear History
            </motion.button>
          </div>

          {filteredHistory.length === 0 ? (
            <div
              className={`rounded-[24px] p-10 text-center ${
                darkMode ? "bg-[#020617]" : "bg-slate-50"
              }`}
            >
              <p
                className={`text-lg ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                No interactions found.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:h-[680px]">
              <div
                className={`xl:col-span-4 xl:h-full rounded-[24px] border overflow-hidden flex flex-col ${
                  darkMode
                    ? "bg-[#020617] border-white/10"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div
                  className={`p-4 border-b ${
                    darkMode ? "border-white/10" : "border-slate-200"
                  }`}
                >
                  <p className="font-semibold">Interaction Index</p>
                  <p
                    className={`text-xs mt-1 ${
                      darkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Click one record to open details
                  </p>
                </div>

                <div className="xl:flex-1 max-h-[620px] xl:max-h-none overflow-y-auto p-3 custom-scrollbar space-y-2">
                  {filteredHistory.map((item) => {
                    const active =
                      String(selectedInteraction?.id) === String(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedInteractionId(item.id)}
                        className={`w-full text-left rounded-2xl border p-4 transition-all ${
                          active
                            ? darkMode
                              ? "bg-indigo-500/15 border-indigo-500/30"
                              : "bg-indigo-50 border-indigo-200"
                            : darkMode
                            ? "bg-[#081028] border-white/10 hover:border-indigo-500/30"
                            : "bg-white border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold truncate">
                              Interaction #{item.id}
                            </p>
                            <p
                              className={`text-xs mt-1 truncate ${
                                darkMode ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              Lead ID: {item.lead_id || "Unlinked"} ·{" "}
                              {item.lead_name || "No linked lead"}
                            </p>
                          </div>

                          {active && (
                            <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                              <Eye size={14} />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <span
                            className={`px-2.5 py-1 rounded-full border text-[11px] font-medium capitalize ${getSentimentClass(
                              item.sentiment
                            )}`}
                          >
                            {item.sentiment || "neutral"}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-full border text-[11px] font-medium ${getFollowUpStatusClass(
                              item.follow_up_status
                            )}`}
                          >
                            {getFollowUpStatusLabel(item.follow_up_status)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={`xl:col-span-8 xl:h-full rounded-[24px] border overflow-hidden flex flex-col ${
                  darkMode
                    ? "bg-[#020617] border-white/10"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                {selectedInteraction ? (
                  <InteractionDetail
                    item={selectedInteraction}
                    darkMode={darkMode}
                    parseTags={parseTags}
                    getSentimentClass={getSentimentClass}
                    getFollowUpStatusClass={getFollowUpStatusClass}
                    getFollowUpStatusLabel={getFollowUpStatusLabel}
                    openStatusMenu={openStatusMenu}
                    setOpenStatusMenu={setOpenStatusMenu}
                    updateFollowUpStatus={updateFollowUpStatus}
                  />
                ) : (
                  <div className="h-full min-h-[420px] flex items-center justify-center text-center">
                    <div>
                      <FileText
                        size={38}
                        className={darkMode ? "text-slate-600 mx-auto" : "text-slate-400 mx-auto"}
                      />
                      <p
                        className={`mt-4 ${
                          darkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Select an interaction to view details.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className={`w-full max-w-md rounded-[30px] border p-8 ${
                  darkMode
                    ? "bg-[#081028] border-white/10"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-6">
                  <AlertTriangle size={26} />
                </div>

                <h2 className="text-3xl font-bold mb-3">
                  Clear All Interactions?
                </h2>

                <p
                  className={`leading-8 ${
                    darkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  This will delete all logged interactions from your current CRM
                  history. This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3 mt-8">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="h-12 px-5 rounded-2xl bg-slate-500/10"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleClearHistory}
                    className="h-12 px-5 rounded-2xl bg-red-600 text-white"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InteractionDetail({
  item,
  darkMode,
  parseTags,
  getSentimentClass,
  getFollowUpStatusClass,
  getFollowUpStatusLabel,
  openStatusMenu,
  setOpenStatusMenu,
  updateFollowUpStatus,
}) {
  return (
    <div className="h-full flex flex-col min-h-0">
      <div
        className={`shrink-0 p-6 border-b ${
          darkMode ? "border-white/10" : "border-slate-200"
        }`}
      >
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-5">
          <div>
            <p
              className={`uppercase tracking-[0.25em] text-xs mb-2 ${
                darkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Selected Interaction
            </p>
            <h3 className="text-3xl font-black">Interaction #{item.id}</h3>
            <p
              className={`text-sm mt-2 ${
                darkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Lead ID: {item.lead_id || "Unlinked"} ·{" "}
              {item.lead_name || "No linked lead"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`px-4 py-2 rounded-full border text-sm font-medium capitalize ${getSentimentClass(
                item.sentiment
              )}`}
            >
              {item.sentiment || "neutral"}
            </span>

            <div className="relative" data-status-dropdown>
              <button
                type="button"
                onClick={() =>
                  setOpenStatusMenu(openStatusMenu === item.id ? null : item.id)
                }
                className={`px-4 py-2 rounded-full border text-sm font-medium outline-none cursor-pointer transition-all duration-200 shadow-sm min-w-[145px] flex items-center justify-between gap-2 ${getFollowUpStatusClass(
                  item.follow_up_status
                )}`}
              >
                <span>{getFollowUpStatusLabel(item.follow_up_status)}</span>
                <ChevronDown size={15} />
              </button>

              <AnimatePresence>
                {openStatusMenu === item.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-2 w-44 rounded-2xl border p-2 shadow-2xl z-50 ${
                      darkMode
                        ? "bg-[#020617] border-white/10"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    {FOLLOW_UP_STATUSES.map((status) => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => updateFollowUpStatus(item.id, status.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                          (item.follow_up_status || "pending") === status.value
                            ? getFollowUpStatusClass(status.value)
                            : darkMode
                            ? "text-slate-300 hover:bg-white/5"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"
          }`}
        >
          <p className="font-semibold mb-2">Linked Lead</p>
          <p className={darkMode ? "text-slate-300" : "text-slate-700"}>
            Lead ID: {item.lead_id || "Unlinked"}
          </p>
          <p className={darkMode ? "text-slate-300" : "text-slate-700"}>
            Name: {item.lead_name || "—"}
          </p>
          <p className={darkMode ? "text-slate-500" : "text-slate-500"}>
            {item.lead_email || "No email"} · {item.lead_phone || "No phone"}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar scroll-smooth p-6">
        <div className="space-y-6 pr-2">
          <InfoBlock label="Notes" value={item.notes} darkMode={darkMode} />

          <InfoBlock label="AI Summary" value={item.summary} darkMode={darkMode} />

          <InfoBlock
            label="Suggested Follow-up"
            value={item.follow_up}
            darkMode={darkMode}
          />

          <div>
            <p
              className={`text-sm mb-2 ${
                darkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              CRM Insight Tags
            </p>
            <TagList tags={parseTags(item.tags)} darkMode={darkMode} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ icon, label, darkMode }) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
        darkMode
          ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
          : "bg-indigo-50 text-indigo-700 border-indigo-100"
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

function InfoBlock({ label, value, darkMode }) {
  return (
    <div>
      <p
        className={`text-sm mb-2 ${
          darkMode ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`leading-8 whitespace-pre-wrap ${
          darkMode ? "text-slate-300" : "text-slate-700"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function TagList({ tags, darkMode }) {
  if (!tags.length) {
    return (
      <span className={darkMode ? "text-slate-500" : "text-slate-400"}>
        —
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${
            darkMode
              ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
              : "bg-indigo-50 text-indigo-700 border-indigo-100"
          }`}
        >
          <Tags size={12} />
          {formatTagLabel(tag)}
        </span>
      ))}
    </div>
  );
}

export default Interaction;
