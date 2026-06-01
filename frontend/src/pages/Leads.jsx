import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  X,
  Pencil,
  AlertTriangle,
  BriefcaseMedical,
  ChevronDown,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../config";

function Leads({ darkMode }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [formError, setFormError] = useState("");

  const [openStatusMenu, setOpenStatusMenu] = useState(null);
  const [openDesignationMenu, setOpenDesignationMenu] = useState(false);
  const [statusMenuPosition, setStatusMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 180,
    maxHeight: 220,
  });

  const statusButtonRefs = useRef({});
  const designationMenuRef = useRef(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    designation: "",
    status: "new",
  });

  const statusOptions = [
    { value: "new", label: "New", description: "Fresh lead" },
    { value: "contacted", label: "Contacted", description: "Initial outreach done" },
    { value: "qualified", label: "Qualified", description: "Relevant prospect" },
    { value: "converted", label: "Converted", description: "Active engagement" },
    { value: "inactive", label: "Inactive", description: "No current action" },
  ];

  const designationOptions = [
    { value: "doctor", label: "Doctor" },
    { value: "nurse", label: "Nurse" },
    { value: "pharmacist", label: "Pharmacist" },
    { value: "admin", label: "Admin" },
    { value: "other", label: "Other" },
  ];

  const inputClass = `w-full h-[52px] rounded-2xl border px-4 outline-none transition-all duration-200 ${
    darkMode
      ? "bg-[#020617] border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
  }`;

  const showNotice = (message, type = "success") => {
    setNotice({ message, type });
    setTimeout(() => setNotice({ type: "", message: "" }), 3000);
  };

  const getApiError = async (res) => {
    try {
      const data = await res.json();

      if (typeof data?.detail === "string") return data.detail;

      if (Array.isArray(data?.detail)) {
        return data.detail
          .map((item) => {
            const field = Array.isArray(item?.loc)
              ? item.loc[item.loc.length - 1]
              : "field";
            const message = item?.msg || "Invalid value";
            return `${field}: ${message}`;
          })
          .join("\n");
      }

      return data?.error || data?.message || "Request failed";
    } catch {
      return "Request failed";
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/leads`);

      if (!res.ok) throw new Error("Failed to load leads");

      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotice(error.message || "Could not load leads", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenStatusMenu(null);
        setOpenDesignationMenu(false);
      }
    };

    const handleClickOutside = (event) => {
      if (
        designationMenuRef.current &&
        !designationMenuRef.current.contains(event.target)
      ) {
        setOpenDesignationMenu(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const calculateMenuPosition = (buttonElement) => {
    if (!buttonElement) return null;

    const rect = buttonElement.getBoundingClientRect();
    const width = Math.max(rect.width + 36, 180);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    const top = rect.bottom + 8;
    const availableHeight = Math.max(96, window.innerHeight - top - 16);

    return {
      top,
      left,
      width,
      maxHeight: Math.min(availableHeight, 220),
    };
  };

  const syncOpenStatusMenuPosition = () => {
    if (openStatusMenu === null) return;

    const buttonElement = statusButtonRefs.current[openStatusMenu];
    if (!buttonElement) {
      setOpenStatusMenu(null);
      return;
    }

    const nextPosition = calculateMenuPosition(buttonElement);
    if (!nextPosition) {
      setOpenStatusMenu(null);
      return;
    }

    setStatusMenuPosition(nextPosition);
  };

  useEffect(() => {
    if (openStatusMenu === null) return undefined;

    let frameId = null;

    const handlePageMove = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(syncOpenStatusMenuPosition);
    };

    window.addEventListener("scroll", handlePageMove, true);
    window.addEventListener("resize", handlePageMove);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", handlePageMove, true);
      window.removeEventListener("resize", handlePageMove);
    };
  }, [openStatusMenu]);

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      designation: "",
      status: "new",
    });
    setOpenDesignationMenu(false);
    setFormError("");
  };

  const validateCreateForm = () => {
    const firstName = formData.first_name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();

    if (!firstName) return "First name is required.";
    if (firstName.length < 2) return "First name must contain at least 2 characters.";
    if (!/[A-Za-z]/.test(firstName)) return "First name must contain letters.";
    if (!formData.designation) return "Designation is required.";
    if (!email) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format.";
    if (!phone) return "Phone number is required.";

    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      return `Phone number must contain exactly 10 digits. You entered ${digits.length} digits.`;
    }

    if (formData.last_name.trim() && !/^[A-Za-z.\s,]+$/.test(formData.last_name)) {
      return "Last name can contain only letters, spaces, dots, or commas.";
    }

    return "";
  };

  const validateEditForm = () => {
    const email = formData.email.trim();
    const phone = formData.phone.trim();

    if (!email) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format.";
    if (!phone) return "Phone number is required.";

    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      return `Phone number must contain exactly 10 digits. You entered ${digits.length} digits.`;
    }

    return "";
  };

  const buildCreatePayload = () => ({
    first_name: formData.first_name.trim(),
    last_name: formData.last_name.trim() || null,
    email: formData.email.trim().toLowerCase(),
    phone: formData.phone.trim(),
    designation: formData.designation,
    status: "new",
  });

  const buildUpdatePayload = () => ({
    email: formData.email.trim().toLowerCase(),
    phone: formData.phone.trim(),
    status: selectedLead?.status || formData.status || "new",
  });

  const handleCreateLead = async () => {
    const error = validateCreateForm();
    if (error) {
      setFormError(error);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCreatePayload()),
      });

      if (!res.ok) throw new Error(await getApiError(res));

      setShowCreateModal(false);
      resetForm();
      fetchLeads();
      showNotice("Lead created successfully");
    } catch (error) {
      setFormError(error.message);
      showNotice(error.message, "error");
    }
  };

  const openEditModal = (lead) => {
    setSelectedLead(lead);
    setFormData({
      first_name: lead.first_name || "",
      last_name: lead.last_name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      designation: lead.designation || "other",
      status: lead.status || "new",
    });
    setFormError("");
    setShowEditModal(true);
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;

    const error = validateEditForm();
    if (error) {
      setFormError(error);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildUpdatePayload()),
      });

      if (!res.ok) throw new Error(await getApiError(res));

      setShowEditModal(false);
      setSelectedLead(null);
      resetForm();
      fetchLeads();
      showNotice("Lead contact information updated successfully");
    } catch (error) {
      setFormError(error.message);
      showNotice(error.message, "error");
    }
  };

  const openDeleteModal = (lead) => {
    setSelectedLead(lead);
    setShowDeleteModal(true);
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;

    try {
      const res = await fetch(`${API_BASE_URL}/leads/${selectedLead.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(await getApiError(res));

      setShowDeleteModal(false);
      setSelectedLead(null);
      fetchLeads();
      showNotice("Lead deleted successfully");
    } catch (error) {
      showNotice(error.message, "error");
    }
  };

  const updateStatus = async (lead, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lead.email,
          phone: lead.phone,
          status,
        }),
      });

      if (!res.ok) throw new Error(await getApiError(res));

      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? { ...item, status } : item))
      );

      setOpenStatusMenu(null);
      showNotice(`Status updated to ${status}`);
    } catch (error) {
      showNotice(error.message, "error");
    }
  };

  const openLeadStatusMenu = (leadId, event) => {
    const buttonElement = event.currentTarget;
    const nextPosition = calculateMenuPosition(buttonElement);
    if (nextPosition) setStatusMenuPosition(nextPosition);
    setOpenStatusMenu(openStatusMenu === leadId ? null : leadId);
  };

  const closeFormModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedLead(null);
    resetForm();
  };

  const getDesignationLabel = (value) => {
    return designationOptions.find((item) => item.value === value)?.label || "Other";
  };

  const filteredLeads = leads.filter((lead) => {
    const q = search.toLowerCase();
    return (
      String(lead.id || "").includes(q) ||
      lead.name?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.phone?.includes(q) ||
      lead.designation?.toLowerCase().includes(q)
    );
  });

  const statusCounts = statusOptions.reduce((acc, status) => {
    acc[status.value] = leads.filter(
      (lead) => (lead.status || "new") === status.value
    ).length;
    return acc;
  }, {});

  const statusClass = (status) => {
    const base =
      "inline-flex items-center justify-between gap-2 min-w-[118px] max-w-full px-3 py-2 rounded-full text-[13px] border font-medium capitalize transition-all duration-200 shadow-sm";

    if (status === "converted") {
      return `${base} ${
        darkMode
          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20"
          : "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
      }`;
    }

    if (status === "qualified") {
      return `${base} ${
        darkMode
          ? "bg-violet-500/15 text-violet-300 border-violet-500/25 hover:bg-violet-500/20"
          : "bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100"
      }`;
    }

    if (status === "contacted") {
      return `${base} ${
        darkMode
          ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/25 hover:bg-cyan-500/20"
          : "bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100"
      }`;
    }

    if (status === "inactive") {
      return `${base} ${
        darkMode
          ? "bg-slate-500/15 text-slate-300 border-slate-500/25 hover:bg-slate-500/20"
          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
      }`;
    }

    return `${base} ${
      darkMode
        ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/25 hover:bg-indigo-500/20"
        : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
    }`;
  };

  const statusGuideClass = (status) => {
    const base =
      "w-full min-h-[52px] px-3 py-2 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-200";

    if (status === "converted") {
      return `${base} ${
        darkMode
          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
          : "bg-emerald-50 text-emerald-700 border-emerald-100"
      }`;
    }

    if (status === "qualified") {
      return `${base} ${
        darkMode
          ? "bg-violet-500/10 text-violet-300 border-violet-500/20"
          : "bg-violet-50 text-violet-700 border-violet-100"
      }`;
    }

    if (status === "contacted") {
      return `${base} ${
        darkMode
          ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
          : "bg-cyan-50 text-cyan-700 border-cyan-100"
      }`;
    }

    if (status === "inactive") {
      return `${base} ${
        darkMode
          ? "bg-slate-500/10 text-slate-300 border-slate-500/20"
          : "bg-slate-100 text-slate-600 border-slate-200"
      }`;
    }

    return `${base} ${
      darkMode
        ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
        : "bg-indigo-50 text-indigo-700 border-indigo-100"
    }`;
  };

  const designationClass = (designation) => {
    const value = designation || "other";

    if (value === "nurse") {
      return darkMode
        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
        : "bg-cyan-50 text-cyan-700 border-cyan-100";
    }

    if (value === "pharmacist") {
      return darkMode
        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
        : "bg-emerald-50 text-emerald-700 border-emerald-100";
    }

    if (value === "admin") {
      return darkMode
        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
        : "bg-amber-50 text-amber-700 border-amber-100";
    }

    if (value === "other") {
      return darkMode
        ? "bg-slate-500/10 text-slate-300 border-slate-500/20"
        : "bg-slate-100 text-slate-600 border-slate-200";
    }

    return darkMode
      ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
      : "bg-indigo-50 text-indigo-700 border-indigo-100";
  };

  return (
    <div
      className={`h-full min-h-0 p-5 overflow-hidden transition-all ${
        darkMode ? "bg-[#020617] text-white" : "bg-[#f5f7fb] text-slate-900"
      }`}
      onClick={() => {
        if (openStatusMenu !== null) setOpenStatusMenu(null);
      }}
    >
      <div className="h-full max-w-7xl mx-auto flex flex-col gap-4 min-h-0">
        <AnimatePresence>
          {notice.message && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 20, x: "-50%" }}
              className={`fixed bottom-6 left-1/2 z-[80] px-5 py-4 rounded-2xl text-white shadow-2xl whitespace-pre-wrap ${
                notice.type === "error" ? "bg-rose-600" : "bg-indigo-600"
              }`}
            >
              {notice.message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 shrink-0">
          <div>
            <p
              className={`uppercase tracking-[0.35em] text-sm font-black mb-3 ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              HCP LEAD WORKSPACE
            </p>

            <h1 className="text-5xl font-black tracking-tight">
              Leads Workspace
            </h1>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="group h-14 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2 shadow-xl shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-500/35 active:translate-y-0"
          >
            <Plus size={19} className="transition-transform duration-300 group-hover:rotate-90" />
            Add Lead
          </button>
        </div>

        <div
          className={`rounded-[24px] border p-4 flex items-center gap-3 shrink-0 ${
            darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"
          }`}
        >
          <Search size={19} className="text-indigo-500" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by lead ID, name, designation, email, or phone..."
            className={`w-full bg-transparent outline-none ${
              darkMode
                ? "text-white placeholder:text-slate-500"
                : "text-slate-900 placeholder:text-slate-400"
            }`}
          />
        </div>

        <div
          className={`rounded-[24px] border p-3 shrink-0 ${
            darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"
          }`}
        >
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between gap-3">
              <p
                className={`text-xs uppercase tracking-[0.32em] font-semibold ${
                  darkMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Status Guide
              </p>
              <span
                className={`hidden md:inline text-xs ${
                  darkMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Real-time lead lifecycle count
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
              {statusOptions.map((status) => (
                <div key={status.value} className={statusGuideClass(status.value)}>
                  <div className="w-full flex items-center justify-center gap-2">
                    <span className="font-bold capitalize text-sm">{status.label}</span>
                    <span
                      className={`min-w-7 h-6 px-2 rounded-full flex items-center justify-center text-[11px] font-black ${
                        darkMode ? "bg-white/10 text-white" : "bg-white/80 text-slate-800"
                      }`}
                    >
                      {statusCounts[status.value] || 0}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] mt-1 normal-case leading-4 ${
                      darkMode ? "text-slate-300/80" : "text-slate-600"
                    }`}
                  >
                    {status.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`rounded-[28px] border overflow-hidden flex-1 min-h-0 flex flex-col ${
            darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[27%]" />
                <col className="w-[13%]" />
                <col className="w-[19%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
              </colgroup>

              <thead className={`sticky top-0 z-20 ${darkMode ? "bg-[#020617]" : "bg-slate-50"}`}>
                <tr>
                  <th className="px-4 py-3.5 text-left">Lead</th>
                  <th className="px-4 py-3.5 text-left">Designation</th>
                  <th className="px-4 py-3.5 text-left">Email</th>
                  <th className="px-4 py-3.5 text-left">Phone</th>
                  <th className="px-4 py-3.5 text-left">Status</th>
                  <th className="px-4 py-3.5 text-center pr-5">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center">
                      Loading leads...
                    </td>
                  </tr>
                ) : filteredLeads.length ? (
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`border-t transition-colors duration-200 ${
                        darkMode
                          ? "border-white/5 hover:bg-white/[0.03]"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                            {lead.name?.charAt(0)?.toUpperCase() || "L"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className="font-semibold whitespace-normal break-words leading-5"
                              title={lead.name || ""}
                            >
                              {lead.name}
                            </p>
                            <p
                              className={`text-sm mt-1 ${
                                darkMode ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              Lead #{lead.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        <span
                          className={`inline-flex max-w-full items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${designationClass(
                            lead.designation
                          )}`}
                        >
                          <BriefcaseMedical size={13} className="shrink-0" />
                          <span className="truncate">{getDesignationLabel(lead.designation)}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 truncate align-middle" title={lead.email || ""}>
                        {lead.email || "—"}
                      </td>

                      <td
                        className="px-4 py-3.5 align-middle whitespace-nowrap text-sm tabular-nums"
                        title={lead.phone || ""}
                      >
                        {lead.phone || "—"}
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        <button
                          ref={(element) => {
                            if (element) {
                              statusButtonRefs.current[lead.id] = element;
                            } else {
                              delete statusButtonRefs.current[lead.id];
                            }
                          }}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openLeadStatusMenu(lead.id, event);
                          }}
                          className={statusClass(lead.status || "new")}
                        >
                          <span>{lead.status || "new"}</span>
                          <span className="text-xs opacity-80">▼</span>
                        </button>
                      </td>

                      <td className="px-4 py-3.5 pr-5 align-middle">
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => openEditModal(lead)}
                            className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center transition-all duration-200 hover:bg-indigo-500/20 hover:scale-105 active:scale-95"
                            title="Edit lead"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => openDeleteModal(lead)}
                            className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center transition-all duration-200 hover:bg-rose-500/20 hover:scale-105 active:scale-95"
                            title="Delete lead"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-10 text-center">
                      No leads found.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan="6" className="h-5 p-0" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <AnimatePresence>
          {openStatusMenu !== null && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "fixed",
                top: statusMenuPosition.top,
                left: statusMenuPosition.left,
                width: statusMenuPosition.width,
                maxHeight: statusMenuPosition.maxHeight,
              }}
              className={`z-[70] rounded-2xl border p-2 shadow-2xl overflow-y-auto ${
                darkMode
                  ? "bg-[#020617] border-white/10"
                  : "bg-white border-slate-200"
              }`}
            >
              {statusOptions.map((status) => {
                const activeLead = leads.find((lead) => lead.id === openStatusMenu);
                const isActive = (activeLead?.status || "new") === status.value;

                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => {
                      if (activeLead) {
                        updateStatus(activeLead, status.value);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold capitalize transition-all ${
                      isActive
                        ? statusClass(status.value)
                        : darkMode
                        ? "text-slate-300 hover:bg-white/5"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {status.label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(showCreateModal || showEditModal) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-5"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`w-full max-w-2xl rounded-[28px] border p-7 ${
                  darkMode
                    ? "bg-[#081028] border-white/10"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">
                      {showCreateModal ? "Create Lead" : "Edit Lead"}
                    </h2>

                    <p
                      className={`mt-1 text-sm ${
                        darkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {showCreateModal
                        ? "Add a new HCP lead with verified identity and contact details."
                        : "Update lead contact information."}
                    </p>
                  </div>

                  <button
                    onClick={closeFormModal}
                    className="h-10 w-10 rounded-xl bg-slate-500/10 flex items-center justify-center transition-all duration-200 hover:bg-slate-500/20 hover:scale-105 active:scale-95"
                  >
                    <X size={18} />
                  </button>
                </div>

                {formError && (
                  <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 whitespace-pre-wrap">
                    {formError}
                  </div>
                )}

                <div className="space-y-4">
                  {showCreateModal && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block text-sm font-medium">
                          First Name <span className="text-rose-400">*</span>
                          <input
                            value={formData.first_name}
                            onChange={(event) => {
                              setFormData({ ...formData, first_name: event.target.value });
                              setFormError("");
                            }}
                            className={`${inputClass} mt-2`}
                          />
                        </label>

                        <label className="block text-sm font-medium">
                          Last Name / Initials
                          <input
                            value={formData.last_name}
                            onChange={(event) => {
                              setFormData({ ...formData, last_name: event.target.value });
                              setFormError("");
                            }}
                            className={`${inputClass} mt-2`}
                          />
                        </label>
                      </div>

                      <div className="relative" ref={designationMenuRef}>
                        <label className="block text-sm font-medium mb-2">
                          Designation <span className="text-rose-400">*</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setOpenDesignationMenu((prev) => !prev)}
                          className={`w-full h-[52px] rounded-2xl border px-4 outline-none flex items-center justify-between transition-all duration-200 ${
                            darkMode
                              ? "bg-[#020617] border-white/10 text-white hover:border-indigo-500/40"
                              : "bg-slate-50 border-slate-200 text-slate-900 hover:border-indigo-300"
                          } ${openDesignationMenu ? "ring-2 ring-indigo-500/30" : ""}`}
                        >
                          <span
                            className={
                              formData.designation
                                ? ""
                                : darkMode
                                ? "text-slate-500"
                                : "text-slate-400"
                            }
                          >
                            {formData.designation
                              ? getDesignationLabel(formData.designation)
                              : "Select designation"}
                          </span>
                          <ChevronDown
                            size={18}
                            className={`transition-transform ${
                              openDesignationMenu ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {openDesignationMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: -6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.96 }}
                              transition={{ duration: 0.15 }}
                              className={`absolute left-0 right-0 mt-2 rounded-2xl border p-2 shadow-2xl z-50 ${
                                darkMode
                                  ? "bg-[#020617] border-white/10"
                                  : "bg-white border-slate-200"
                              }`}
                            >
                              {designationOptions.map((item) => {
                                const active = formData.designation === item.value;

                                return (
                                  <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, designation: item.value });
                                      setOpenDesignationMenu(false);
                                      setFormError("");
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                                      active
                                        ? designationClass(item.value)
                                        : darkMode
                                        ? "text-slate-300 hover:bg-white/5"
                                        : "text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {item.label}
                                    {active && <Check size={15} />}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}

                  {showEditModal && selectedLead && (
                    <>
                      <div
                        className={`rounded-2xl border px-4 py-3 ${
                          darkMode
                            ? "bg-[#020617] border-white/10"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <p
                          className={`text-xs uppercase tracking-[0.25em] mb-1 ${
                            darkMode ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          Lead
                        </p>
                        <p className="font-semibold">{selectedLead.name}</p>
                        <p
                          className={`text-sm mt-1 ${
                            darkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {getDesignationLabel(selectedLead.designation)} · Lead #{selectedLead.id}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl border px-4 py-3 ${
                          darkMode
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
                            : "bg-amber-50 border-amber-100 text-amber-700"
                        }`}
                      >
                        Name and designation are locked after creation. Only email and phone can be updated here.
                      </div>
                    </>
                  )}

                  <label className="block text-sm font-medium">
                    Email <span className="text-rose-400">*</span>
                    <input
                      value={formData.email}
                      onChange={(event) => {
                        setFormData({ ...formData, email: event.target.value });
                        setFormError("");
                      }}
                      className={`${inputClass} mt-2`}
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Phone <span className="text-rose-400">*</span>
                    <input
                      value={formData.phone}
                      onChange={(event) => {
                        setFormData({ ...formData, phone: event.target.value });
                        setFormError("");
                      }}
                      className={`${inputClass} mt-2`}
                    />
                  </label>

                  <button
                    onClick={showCreateModal ? handleCreateLead : handleUpdateLead}
                    className="group w-full h-[52px] rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-500/35 active:translate-y-0"
                  >
                    <span className="transition-all duration-300 group-hover:tracking-wide">
                      {showCreateModal ? "Create Lead" : "Save Contact Changes"}
                    </span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDeleteModal && selectedLead && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-5"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`w-full max-w-md rounded-[28px] border p-7 ${
                  darkMode
                    ? "bg-[#081028] border-white/10"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-5">
                  <AlertTriangle size={26} />
                </div>

                <h2 className="text-2xl font-bold mb-3">Delete Lead?</h2>

                <p
                  className={`leading-7 ${
                    darkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Are you sure you want to delete <b>{selectedLead.name}</b>?
                </p>

                <div className="flex justify-end gap-3 mt-7">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedLead(null);
                    }}
                    className="h-11 px-5 rounded-2xl bg-slate-500/10 transition-all duration-200 hover:bg-slate-500/20"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleDeleteLead}
                    className="h-11 px-5 rounded-2xl bg-rose-600 text-white transition-all duration-200 hover:bg-rose-700 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Delete
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

export default Leads;
