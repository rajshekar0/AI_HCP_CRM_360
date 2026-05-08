import { useEffect, useRef, useState } from "react";
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
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
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
        "Welcome. I can create leads from typed or voice input, log HCP interactions, summarize discussions, and suggest follow-ups. Invalid phone numbers will not be saved.",
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
      // ignore invalid localStorage
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
  const [dynamicPrompts, setDynamicPrompts] = useState([]);

  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || sessions[0];

  const messages = activeSession?.messages || [];
  const lastInteraction = activeSession?.lastInteraction || "";

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
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    loadDynamicPrompts();

    return () => recognitionRef.current?.stop();
  }, []);

  const updateActiveSession = (updates) => {
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
    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              messages: [...session.messages, message],
              title:
                session.title === "New Chat" && message.role === "user"
                  ? message.content.slice(0, 38)
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

  const loadDynamicPrompts = async () => {
    try {
      const [leadsRes, interactionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/leads`),
        fetch(`${API_BASE_URL}/interactions`),
      ]);

      const leads = await leadsRes.json();
      const interactions = await interactionsRes.json();

      const prompts = [];

      if (!leads.length) {
        prompts.push(
          "Create lead for Dr Sharma email sharma@test.com phone 9876543210"
        );
      }

      if (leads.length) {
        prompts.push(
          `Create a follow-up note for ${leads[0].name}`,
          `Summarize CRM activity for lead ${leads[0].name}`
        );
      }

      if (interactions.length) {
        prompts.push(
          `Suggest follow ups for this interaction: ${interactions[0].notes}`,
          `Summarize this HCP interaction: ${interactions[0].notes}`
        );
      } else {
        prompts.push(
          "Log interaction: Doctor was interested in Product X and asked for samples"
        );
      }

      prompts.push(
        "Create lead for Kavya email kavya at gmail dot com phone 9999999999"
      );

      prompts.push("Create lead for Ravi phone 123456789012");

      setDynamicPrompts(prompts.slice(0, 5));
    } catch {
      setDynamicPrompts([
        "Create lead for Dr Sharma email sharma@test.com phone 9876543210",
        "Log interaction: Doctor was interested in Product X and asked for samples",
        "Create lead for Ravi phone 123456789012",
      ]);
    }
  };

  const formatAssistantResponse = (data) => {
    const result = data?.result || {};

    if (result.error) {
      return `Not saved.\n\nReason: ${result.error}`;
    }

    let text = result.message || "Done";

    if (result.lead) {
      const lead = result.lead;

      text += `\n\nLead Details`;
      text += `\nName: ${lead.name || "N/A"}`;
      text += `\nEmail: ${lead.email || "N/A"}`;
      text += `\nPhone: ${lead.phone || "N/A"}`;
      text += `\nStatus: ${lead.status || "new"}`;
    }

    if (result.summary) {
      text += `\n\nAI Summary:\n${result.summary}`;
    }

    if (result.sentiment) {
      text += `\n\nSentiment:\n${result.sentiment}`;
    }

    if (result.suggestions) {
      text += `\n\nSuggested Follow-ups:\n${result.suggestions}`;
    }

    if (result.interaction_id) {
      text += `\n\nInteraction ID: ${result.interaction_id}`;
    }

    return text;
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

    if (!rawInput.trim() || loading) {
      return;
    }

    let currentInput = rawInput.trim();

    if (
      currentInput.toLowerCase().includes("suggest") &&
      currentInput.toLowerCase().includes("follow")
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

      loadDynamicPrompts();
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

  const clearCurrentChat = () => {
    updateActiveSession({
      messages: defaultMessages(),
      title: "New Chat",
      lastInteraction: "",
    });
  };

  const resetAllHistory = () => {
    const fresh = createNewSession();

    setSessions([fresh]);
    setActiveSessionId(fresh.id);

    localStorage.removeItem("ai-crm-chat-sessions");
    localStorage.removeItem("ai-crm-active-session");
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
      className={`h-[calc(100vh-40px)] rounded-[34px] overflow-hidden border flex transition-all duration-300 ${
        darkMode
          ? "bg-[#020617] border-white/10"
          : "bg-[#f5f7fb] border-slate-200"
      }`}
    >
      <aside
        className={`w-[330px] shrink-0 flex flex-col border-r transition-all duration-300 ${
          darkMode
            ? "bg-[#020617] border-white/10"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="p-5 space-y-3">
          <motion.button
            whileHover={{
              y: -2,
              scale: 1.01,
            }}
            whileTap={{
              scale: 0.98,
            }}
            onClick={startNewChat}
            className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center gap-3 font-medium shadow-xl"
          >
            <Plus size={18} />
            New Chat
          </motion.button>

          <button
            onClick={clearCurrentChat}
            className={`w-full h-[46px] rounded-2xl flex items-center justify-center gap-3 ${
              darkMode
                ? "bg-[#081028] text-slate-300 border border-white/10"
                : "bg-slate-50 text-slate-600 border border-slate-200"
            }`}
          >
            <Trash2 size={17} />
            Clear Current
          </button>

          <button
            onClick={resetAllHistory}
            className={`w-full h-[42px] rounded-2xl flex items-center justify-center gap-3 text-sm ${
              darkMode
                ? "bg-red-500/10 text-red-300 border border-red-500/20"
                : "bg-red-50 text-red-600 border border-red-100"
            }`}
          >
            Reset All History
          </button>
        </div>

        <div className="px-5 pb-4">
          <p
            className={`uppercase tracking-[0.25em] text-xs mb-4 ${
              darkMode ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Chat History
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center justify-between gap-2 rounded-2xl border p-3 ${
                activeSession.id === session.id
                  ? darkMode
                    ? "bg-indigo-500/15 border-indigo-500/30"
                    : "bg-indigo-50 border-indigo-200"
                  : darkMode
                  ? "bg-[#081028] border-white/10 hover:border-indigo-500/30"
                  : "bg-white border-slate-200 hover:border-indigo-300"
              }`}
            >
              <button
                onClick={() => setActiveSessionId(session.id)}
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
                onClick={() => deleteSession(session.id)}
                className={
                  darkMode
                    ? "text-slate-500 hover:text-red-400"
                    : "text-slate-400 hover:text-red-500"
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-white/10">
          <div className="flex items-center justify-between mb-4">
            <p
              className={`uppercase tracking-[0.25em] text-xs ${
                darkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Smart Prompts
            </p>

            <button onClick={loadDynamicPrompts} className="text-indigo-500">
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto">
            {dynamicPrompts.map((prompt, index) => (
              <motion.button
                whileHover={{
                  y: -2,
                }}
                key={index}
                onClick={() => sendMessage(prompt)}
                className={`w-full text-left rounded-2xl border p-4 ${
                  darkMode
                    ? "bg-[#081028] border-white/10 hover:border-indigo-500/40"
                    : "bg-white border-slate-200 hover:border-indigo-300"
                }`}
              >
                <div className="flex gap-3">
                  <Sparkles size={15} className="text-indigo-500 mt-1" />

                  <span
                    className={`text-sm leading-7 ${
                      darkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    {prompt}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div
          className={`px-8 py-6 border-b ${
            darkMode
              ? "bg-[#020617] border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-4 ${
                  darkMode
                    ? "bg-indigo-500/10 text-indigo-300"
                    : "bg-indigo-100 text-indigo-700"
                }`}
              >
                <Sparkles size={14} />
                LangGraph + Groq powered assistant
              </div>

              <h1 className="text-3xl font-bold">HCP CRM Copilot</h1>
            </div>

            <div
              className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                darkMode
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </div>
          </div>
        </div>

        <div
          className={`flex-1 overflow-y-auto px-6 md:px-12 py-10 ${
            darkMode
              ? "bg-gradient-to-b from-[#020617] to-[#0f172a]"
              : "bg-gradient-to-b from-[#f8fafc] to-white"
          }`}
        >
          <div className="max-w-5xl mx-auto space-y-8">
            {messages.map((msg, index) => (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.25,
                }}
                key={index}
                className={`flex gap-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xl">
                    <Bot size={19} />
                  </div>
                )}

                <div className="flex flex-col max-w-[78%]">
                  <motion.div
                    whileHover={{
                      y: -2,
                    }}
                    className={`px-6 py-5 rounded-[28px] whitespace-pre-wrap leading-8 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md shadow-xl"
                        : darkMode
                        ? "bg-[#081028] border border-white/10 text-slate-100 rounded-bl-md"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm"
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
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      darkMode
                        ? "bg-slate-800 text-white"
                        : "bg-white border border-slate-200 text-slate-700"
                    }`}
                  >
                    <User size={18} />
                  </div>
                )}
              </motion.div>
            ))}

            {loading && (
              <div className="flex gap-4">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center">
                  <Bot size={18} />
                </div>

                <div
                  className={`rounded-[26px] px-6 py-5 flex items-center gap-2 ${
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
          className={`border-t px-6 md:px-12 py-6 ${
            darkMode
              ? "bg-[#020617] border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="max-w-5xl mx-auto">
            <div
              className={`flex items-center gap-3 rounded-[28px] border p-3 ${
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
                className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                  listening
                    ? "bg-red-500 text-white animate-pulse"
                    : darkMode
                    ? "bg-slate-900 hover:bg-indigo-600"
                    : "bg-white border border-slate-200 hover:bg-indigo-50"
                }`}
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
                    : "Message AI CRM Copilot..."
                }
                className={`flex-1 bg-transparent outline-none px-2 ${
                  darkMode
                    ? "text-white placeholder:text-slate-500"
                    : "text-slate-800 placeholder:text-slate-400"
                }`}
              />

              <motion.button
                whileHover={{
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                onClick={() => sendMessage()}
                disabled={loading}
                className="h-12 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2 shadow-xl disabled:opacity-50"
              >
                <Send size={17} />
                Send
              </motion.button>
            </div>

            <p
              className={`text-xs mt-4 text-center ${
                darkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {listening
                ? voiceStatus || "Voice input active."
                : "Try: “Create lead for Divya Sharma email divya at gmail dot com phone 9972848672”. 12-digit phone numbers will be rejected."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Chat;