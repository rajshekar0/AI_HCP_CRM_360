import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  User,
  Send,
  Mic,
  MicOff,
  Sparkles,
  Plus,
  MessageSquare,
  Copy,
  Check,
  Trash2,
  PanelLeft,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../config";

function Chat({ darkMode }) {
  const now = () =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const defaultMessages = () => [
    {
      role: "assistant",
      content:
        "Welcome to AI HCP-CRM 360 Copilot. I can help create HCP leads, log interactions, summarize notes, generate follow-ups, and provide CRM intelligence using HCP context.",
      time: now(),
    },
  ];

  const createNewSession = () => ({
    id: Date.now().toString(),
    title: "New Chat",
    createdAt: new Date().toISOString(),
    messages: defaultMessages(),
    lastInteraction: "",
  });

  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem("ai-crm-chat-sessions");

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed) && parsed.length) {
          return parsed;
        }
      }
    } catch {
      // Ignore invalid localStorage
    }

    return [createNewSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState(
    () => localStorage.getItem("ai-crm-active-session") || null
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Voice ready");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");

  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  const activeSession = useMemo(() => {
    return sessions.find((session) => session.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  const messages = activeSession?.messages || [];
  const lastInteraction = activeSession?.lastInteraction || "";

  const filteredSessions = useMemo(() => {
    const q = sessionSearch.toLowerCase().trim();

    if (!q) return sessions;

    return sessions.filter((session) => {
      return (
        session.title?.toLowerCase().includes(q) ||
        session.messages?.some((msg) => msg.content?.toLowerCase().includes(q))
      );
    });
  }, [sessions, sessionSearch]);

  useEffect(() => {
    if (!activeSessionId && sessions.length) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    localStorage.setItem("ai-crm-chat-sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem("ai-crm-active-session", activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const updateActiveSession = (updates) => {
    if (!activeSession) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              ...updates,
            }
          : session
      )
    );
  };

  const addMessage = (message) => {
    if (!activeSession) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              messages: [...session.messages, message],
              title:
                session.title === "New Chat" && message.role === "user"
                  ? message.content.slice(0, 42)
                  : session.title,
            }
          : session
      )
    );
  };

  const getBackendError = async (res) => {
    try {
      const data = await res.json();

      if (typeof data?.detail === "string") {
        return data.detail;
      }

      if (Array.isArray(data?.detail)) {
        return data.detail
          .map((item) => item?.msg || item?.message || JSON.stringify(item))
          .join("\n");
      }

      return data?.error || data?.message || "Backend request failed";
    } catch {
      return "Backend request failed";
    }
  };

  const getLeadDisplayName = (lead) => {
    if (!lead) return "N/A";

    const directName = lead.name?.trim();
    if (directName) return directName;

    const firstName = lead.first_name?.trim();
    const lastName = lead.last_name?.trim();

    const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim();
    return combinedName || "N/A";
  };

  const getDesignationLabel = (value) => {
    if (!value) return "N/A";

    return String(value)
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatLeadChoice = (lead) => {
    if (!lead) return "";

    return `ID ${lead.id || "N/A"} — ${getLeadDisplayName(lead)} — ${
      lead.email || "No email"
    } — ${lead.phone || "No phone"}`;
  };

  const formatTagsForDisplay = (tagString) => {
    return String(tagString || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) =>
        tag
          .replaceAll("-", " ")
          .replaceAll("_", " ")
          .split(" ")
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ")
      )
      .join(", ");
  };

  const formatAssistantResponse = (data) => {
    const result = data?.result || data?.messages?.[0] || data || {};

    if (typeof result === "string") {
      return result;
    }

    if (result.error) {
      let text = `Not saved.\n\nReason: ${result.error}`;

      if (result.needs_disambiguation && Array.isArray(result.matching_leads)) {
        text += "\n\nMatching Leads";
        result.matching_leads.forEach((lead) => {
          text += `\n${formatLeadChoice(lead)}`;
        });
        text += "\n\nPlease continue with both name and lead ID.";
      }

      if (result.lead_id_mismatch && result.actual_lead) {
        text += "\n\nActual Lead";
        text += `\n${formatLeadChoice(result.actual_lead)}`;
      }

      if (result.existing_interaction) {
        text += `\n\nExisting Interaction #${result.existing_interaction.id}`;
        text += `\nSummary: ${result.existing_interaction.summary || "N/A"}`;
        text += `\nSuggested Follow-up: ${
          result.existing_interaction.follow_up || "N/A"
        }`;
      }

      if (result.lead) {
        text += "\n\nLead Context";
        text += `\n${formatLeadChoice(result.lead)}`;
      }

      return text;
    }

    let text = result.message || "Done";

    if (result.lead) {
      const lead = result.lead;
      text += "\n\nLead Details";
      text += `\nName: ${getLeadDisplayName(lead)}`;

      if (lead.designation) {
        text += `\nDesignation: ${getDesignationLabel(lead.designation)}`;
      }

      text += `\nEmail: ${lead.email || "N/A"}`;
      text += `\nPhone: ${lead.phone || "N/A"}`;
    }

    if (result.source?.lead_id || result.source?.lead_name) {
      text += "\n\nGrounded Source";
      text += `\nLead ID: ${result.source.lead_id || "N/A"}`;
      text += `\nLead Name: ${result.source.lead_name || "N/A"}`;
    }

    const linkedLead = result.linked_lead || result.lead || null;
    const linkedLeadId = result.lead_id || linkedLead?.id;
    const linkedLeadName = result.lead_name || getLeadDisplayName(linkedLead);

    if (linkedLeadId || linkedLeadName !== "N/A") {
      text += "\n\nLinked Lead";
      text += `\nLead ID: ${linkedLeadId || "N/A"}`;
      text += `\nName: ${linkedLeadName}`;
    }

    if (result.summary) {
      text += `\n\nAI Summary\n${result.summary}`;
    }

    if (result.sentiment) {
      text += `\n\nSentiment\n${result.sentiment}`;
    }

    if (result.follow_up) {
      text += `\n\nSuggested Follow-up\n${result.follow_up}`;
    }

    if (result.suggestions) {
      text += `\n\nSuggested Follow-up\n${result.suggestions}`;
    }

    if (result.tags) {
      text += `\n\nCRM Insight Tags\n${formatTagsForDisplay(result.tags)}`;
    }

    if (result.interaction_id) {
      text += `\n\nInteraction ID: ${result.interaction_id}`;
    }

    return text;
  };

  const getMessageTone = (message) => {
    const lower = (message.content || "").toLowerCase();

    if (
      lower.includes("not saved") ||
      lower.includes("unable to complete") ||
      lower.includes("couldn't find") ||
      lower.includes("failed") ||
      lower.includes("mismatch") ||
      lower.includes("please specify")
    ) {
      return "warning";
    }

    if (
      lower.includes("successfully") ||
      lower.includes("generated") ||
      lower.includes("logged") ||
      lower.includes("created")
    ) {
      return "success";
    }

    return "default";
  };

  const copyMessage = async (content, index) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);

    setTimeout(() => {
      setCopiedIndex(null);
    }, 1600);
  };

  const sendMessage = async (customInput = null) => {
    const rawInput = customInput || input;

    if (!rawInput.trim() || loading || !activeSession) {
      return;
    }

    let currentInput = rawInput.trim();

    if (
      currentInput.toLowerCase().includes("suggest") &&
      currentInput.toLowerCase().includes("follow") &&
      lastInteraction
    ) {
      currentInput = `${currentInput}. Previous interaction context: ${lastInteraction}`;
    }

    addMessage({
      role: "user",
      content: rawInput.trim(),
      time: now(),
    });

    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: currentInput,
          session_id: activeSession.id,
        }),
      });

      if (!res.ok) {
        const errorMessage = await getBackendError(res);
        throw new Error(errorMessage);
      }

      const data = await res.json();

      if (rawInput.toLowerCase().includes("log interaction")) {
        updateActiveSession({
          lastInteraction: rawInput,
        });
      }

      addMessage({
        role: "assistant",
        content: formatAssistantResponse(data),
        time: now(),
      });
    } catch (error) {
      addMessage({
        role: "assistant",
        content: `Unable to complete request.\n\n${
          error.message || "Please ensure FastAPI backend is running."
        }`,
        time: now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    const session = createNewSession();

    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setInput("");
  };

  const deleteSession = (id) => {
    setSessions((prev) => {
      const remaining = prev.filter((session) => session.id !== id);

      if (!remaining.length) {
        const fresh = createNewSession();
        setActiveSessionId(fresh.id);
        return [fresh];
      }

      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
      }

      return remaining;
    });
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addMessage({
        role: "assistant",
        content:
          "Voice input is not supported in this browser. Please use Chrome or Edge.",
        time: now(),
      });

      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      setVoiceStatus("Voice stopped.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setVoiceStatus("Listening... speak naturally.");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setInput(transcript.trim());
      setVoiceStatus("Voice captured. Review once, then send.");
    };

    recognition.onerror = (event) => {
      setListening(false);
      setVoiceStatus(`Voice error: ${event.error}`);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div
      className={`relative h-[calc(100vh-40px)] rounded-[34px] overflow-hidden border transition-all duration-300 ${
        darkMode
          ? "bg-[#020617] border-white/10"
          : "bg-[#f5f7fb] border-slate-200"
      }`}
    >
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: -380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -380, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute left-0 top-0 bottom-0 z-40 w-[370px] max-w-[92%] flex flex-col border-r shadow-2xl ${
                darkMode
                  ? "bg-[#020617] border-white/10"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="p-5 border-b border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">Conversations</h2>
                    <p
                      className={`text-xs mt-1 ${
                        darkMode ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      Saved copilot sessions
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <TooltipIconButton
                      darkMode={darkMode}
                      label="Start a new conversation"
                      onClick={startNewChat}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent"
                    >
                      <Plus size={18} />
                    </TooltipIconButton>

                    <button
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      title="Close conversations"
                      className={`h-10 w-10 rounded-2xl border flex items-center justify-center transition ${
                        darkMode
                          ? "bg-[#081028] border-white/10 text-slate-300 hover:border-indigo-500/40"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-400"
                      }`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 border-b border-white/10">
                <div
                  className={`h-11 rounded-2xl px-4 flex items-center gap-3 ${
                    darkMode ? "bg-[#081028]" : "bg-slate-50"
                  }`}
                >
                  <MessageSquare size={16} className="text-indigo-500" />
                  <input
                    value={sessionSearch}
                    onChange={(event) => setSessionSearch(event.target.value)}
                    placeholder="Search conversations..."
                    className={`bg-transparent outline-none w-full text-sm ${
                      darkMode
                        ? "text-white placeholder:text-slate-500"
                        : "text-slate-900 placeholder:text-slate-400"
                    }`}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                {filteredSessions.length === 0 ? (
                  <div
                    className={`rounded-2xl border p-5 text-center text-sm ${
                      darkMode
                        ? "bg-[#081028] border-white/10 text-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    No conversations found.
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-2 rounded-2xl border p-3 transition-all ${
                        activeSession?.id === session.id
                          ? darkMode
                            ? "bg-indigo-500/15 border-indigo-500/30"
                            : "bg-indigo-50 border-indigo-200"
                          : darkMode
                          ? "bg-[#081028] border-white/10 hover:border-indigo-500/30"
                          : "bg-white border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setActiveSessionId(session.id);
                          setSidebarOpen(false);
                        }}
                        className="flex items-center gap-3 text-left flex-1 min-w-0"
                      >
                        <MessageSquare size={16} className="text-indigo-500 shrink-0" />

                        <span
                          className={`text-sm truncate ${
                            darkMode ? "text-slate-300" : "text-slate-700"
                          }`}
                        >
                          {session.title || "New Chat"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteSession(session.id)}
                        title="Delete conversation"
                        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 opacity-70 hover:opacity-100 ${
                          darkMode
                            ? "text-slate-500 hover:text-red-300 hover:bg-red-500/10"
                            : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                        }`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="h-full flex flex-col min-w-0">
        <div
          className={`px-6 md:px-8 py-5 border-b ${
            darkMode
              ? "bg-[#020617] border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                title="Open conversations"
                className={`h-11 w-11 rounded-2xl border flex items-center justify-center shrink-0 transition ${
                  darkMode
                    ? "bg-[#081028] border-white/10 text-slate-300 hover:border-indigo-500/40"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-400"
                }`}
              >
                <PanelLeft size={19} />
              </button>

              <div className="min-w-0">
                <h1 className="text-3xl font-black truncate">AI Copilot</h1>
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mt-3 ${
                    darkMode
                      ? "bg-indigo-500/10 text-indigo-300"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  <Sparkles size={14} />
                  AI-powered HCP CRM assistant
                </div>
              </div>
            </div>

            <div
              className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                darkMode
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </div>
          </div>
        </div>

        <div
          className={`flex-1 overflow-y-auto px-6 md:px-10 py-8 custom-scrollbar ${
            darkMode
              ? "bg-gradient-to-b from-[#020617] to-[#0f172a]"
              : "bg-gradient-to-b from-[#f8fafc] to-white"
          }`}
        >
          <div className="max-w-5xl mx-auto space-y-6">
            {messages.map((msg, index) => {
              const tone = getMessageTone(msg);

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  key={`${msg.time}-${index}`}
                  className={`flex gap-4 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xl">
                      <Bot size={18} />
                    </div>
                  )}

                  <div className="flex flex-col max-w-[76%]">
                    <motion.div
                      whileHover={{ y: -1 }}
                      className={`px-5 py-4 rounded-[24px] whitespace-pre-wrap leading-7 text-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md shadow-xl"
                          : getAssistantBubbleClass(tone, darkMode)
                      }`}
                    >
                      {msg.content}
                    </motion.div>

                    <div
                      className={`flex items-center gap-3 mt-2 text-xs ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      } ${darkMode ? "text-slate-500" : "text-slate-400"}`}
                    >
                      <span>{msg.time}</span>

                      {msg.role === "assistant" && (
                        <button
                          onClick={() => copyMessage(msg.content, index)}
                          className="flex items-center gap-1 hover:text-indigo-500 transition"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check size={13} />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        darkMode
                          ? "bg-slate-800 text-white"
                          : "bg-white border border-slate-200 text-slate-700"
                      }`}
                    >
                      <User size={17} />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {loading && (
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center">
                  <Bot size={18} />
                </div>

                <div
                  className={`rounded-[24px] px-5 py-4 flex items-center gap-2 ${
                    darkMode
                      ? "bg-[#081028] border border-white/10"
                      : "bg-white border border-slate-200"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-150" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-300" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div
          className={`border-t px-6 md:px-10 py-5 ${
            darkMode
              ? "bg-[#020617] border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="max-w-5xl mx-auto">
            <div
              className={`flex items-center gap-3 rounded-[26px] border p-3 ${
                listening ? "ring-2 ring-indigo-500" : ""
              } ${
                darkMode
                  ? "bg-[#081028] border-white/10"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  listening
                    ? "bg-red-500 text-white animate-pulse"
                    : darkMode
                    ? "bg-slate-900 hover:bg-indigo-600 text-white"
                    : "bg-white border border-slate-200 hover:bg-indigo-50 text-slate-700"
                }`}
                title="Voice input"
              >
                {listening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    sendMessage();
                  }
                }}
                placeholder={
                  listening
                    ? "Listening..."
                    : "Ask AI HCP-CRM 360 to create leads, log interactions, summarize notes, or generate follow-ups..."
                }
                className={`flex-1 bg-transparent outline-none px-2 ${
                  darkMode
                    ? "text-white placeholder:text-slate-500"
                    : "text-slate-800 placeholder:text-slate-400"
                }`}
              />

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => sendMessage()}
                disabled={loading}
                className="h-12 w-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xl disabled:opacity-50 shrink-0"
                title="Send"
              >
                <Send size={18} />
              </motion.button>
            </div>

            {listening && (
              <p
                className={`text-xs mt-3 text-center ${
                  darkMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {voiceStatus || "Voice input active."}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function TooltipIconButton({ children, label, onClick, className = "", darkMode }) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={`h-10 w-10 rounded-2xl border flex items-center justify-center transition ${className}`}
      >
        {children}
      </button>

      <div
        className={`pointer-events-none absolute right-0 top-12 z-50 rounded-full border px-4 py-2 text-xs opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 whitespace-nowrap shadow-2xl ${
          darkMode
            ? "bg-[#020617]/95 border-indigo-500/30 text-white"
            : "bg-white border-indigo-200 text-slate-700"
        }`}
      >
        {label}
      </div>
    </div>
  );
}

function getAssistantBubbleClass(tone, darkMode) {
  if (tone === "warning") {
    return darkMode
      ? "bg-amber-500/10 border border-amber-500/20 text-amber-100 rounded-bl-md"
      : "bg-amber-50 border border-amber-100 text-amber-900 rounded-bl-md";
  }

  if (tone === "success") {
    return darkMode
      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-bl-md"
      : "bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-bl-md";
  }

  return darkMode
    ? "bg-[#081028] border border-white/10 text-slate-100 rounded-bl-md"
    : "bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm";
}

export default Chat;
