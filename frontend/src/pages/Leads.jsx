import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  X,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../config";

function Leads({ darkMode }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState({
    type: "",
    message: "",
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "new",
  });

  const statusOptions = [
    "new",
    "contacted",
    "qualified",
    "converted",
    "inactive",
  ];

  const inputClass = `w-full h-[52px] rounded-2xl border px-4 outline-none ${
    darkMode
      ? "bg-[#020617] border-white/10 text-white placeholder:text-slate-500"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
  }`;

  const showNotice = (message, type = "success") => {
    setNotice({
      message,
      type,
    });

    setTimeout(() => {
      setNotice({
        type: "",
        message: "",
      });
    }, 3000);
  };

  const getApiError = async (res) => {
    try {
      const data = await res.json();

      if (typeof data?.detail === "string") {
        return data.detail;
      }

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

      if (!res.ok) {
        throw new Error("Failed to load leads");
      }

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

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      status: "new",
    });

    setFormError("");
  };

  const validateForm = () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();

    if (!name) {
      return "Name is required.";
    }

    if (name.length < 2) {
      return "Name must contain at least 2 characters.";
    }

    if (!/[A-Za-z]/.test(name)) {
      return "Name must contain letters.";
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Invalid email format. Example: doctor@gmail.com";
    }

    if (phone) {
      const digits = phone.replace(/\D/g, "");

      if (digits.length !== 10) {
        return `Phone number must contain exactly 10 digits. You entered ${digits.length} digits.`;
      }
    }

    return "";
  };

  const buildPayload = () => ({
  name: formData.name.trim(),
  email: formData.email.trim()
    ? formData.email.trim().toLowerCase()
    : null,
  phone: formData.phone.trim() || null,
  status: formData.status || "new",
});

  const handleCreateLead = async () => {
    const error = validateForm();

    if (error) {
      setFormError(error);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });

      if (!res.ok) {
        const message = await getApiError(res);
        throw new Error(message);
      }

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
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status || "new",
    });

    setFormError("");
    setShowEditModal(true);
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) {
      return;
    }

    const error = validateForm();

    if (error) {
      setFormError(error);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });

      if (!res.ok) {
        const message = await getApiError(res);
        throw new Error(message);
      }

      setShowEditModal(false);
      setSelectedLead(null);
      resetForm();
      fetchLeads();
      showNotice("Lead updated successfully");
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
    if (!selectedLead) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/leads/${selectedLead.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const message = await getApiError(res);
        throw new Error(message);
      }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email || null,
          phone: lead.phone || null,
          status,
        }),
      });

      if (!res.ok) {
        const message = await getApiError(res);
        throw new Error(message);
      }

      fetchLeads();
      showNotice("Status updated");
    } catch (error) {
      showNotice(error.message, "error");
    }
  };

  const closeFormModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedLead(null);
    resetForm();
  };

  const filteredLeads = leads.filter((lead) => {
    const q = search.toLowerCase();

    return (
      lead.name?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.phone?.includes(q)
    );
  });

  const statusClass = (status) => {
    const base = "px-3 py-2 rounded-xl text-sm border outline-none";

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

  return (
    <div
      className={`min-h-screen p-8 transition-all ${
        darkMode ? "bg-[#020617] text-white" : "bg-[#f5f7fb] text-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-7">
        <AnimatePresence>
          {notice.message && (
            <motion.div
              initial={{
                opacity: 0,
                y: -16,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
              }}
              className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl text-white shadow-xl whitespace-pre-wrap ${
                notice.type === "error" ? "bg-rose-600" : "bg-indigo-600"
              }`}
            >
              {notice.message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p
              className={`uppercase tracking-[0.3em] text-xs mb-3 ${
                darkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              CRM Lead Management
            </p>

            <h1 className="text-4xl font-black">Leads Workspace</h1>

            <p
              className={`mt-3 ${
                darkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Manual lead creation also blocks invalid phone numbers. Exactly 10
              digits only.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="h-12 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2"
          >
            <Plus size={18} />
            Add Lead
          </button>
        </div>

        <div
          className={`rounded-[24px] border p-4 flex items-center gap-3 ${
            darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"
          }`}
        >
          <Search size={19} className="text-indigo-500" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, or phone..."
            className={`w-full bg-transparent outline-none ${
              darkMode
                ? "text-white placeholder:text-slate-500"
                : "text-slate-900 placeholder:text-slate-400"
            }`}
          />
        </div>

        <div
          className={`rounded-[28px] border overflow-hidden ${
            darkMode ? "bg-[#081028] border-white/10" : "bg-white border-slate-200"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={darkMode ? "bg-[#020617]" : "bg-slate-50"}>
                <tr>
                  <th className="px-6 py-4 text-left">Lead</th>
                  <th className="px-6 py-4 text-left">Email</th>
                  <th className="px-6 py-4 text-left">Phone</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center">
                      Loading leads...
                    </td>
                  </tr>
                ) : filteredLeads.length ? (
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`border-t ${
                        darkMode
                          ? "border-white/5 hover:bg-white/[0.03]"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold">
                            {lead.name?.charAt(0)?.toUpperCase() || "L"}
                          </div>

                          <div>
                            <p className="font-semibold">{lead.name}</p>
                            <p
                              className={`text-sm ${
                                darkMode ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              Lead #{lead.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">{lead.email || "—"}</td>
                      <td className="px-6 py-5">{lead.phone || "—"}</td>

                      <td className="px-6 py-5">
                        <select
                          value={lead.status || "new"}
                          onChange={(event) =>
                            updateStatus(lead, event.target.value)
                          }
                          className={statusClass(lead.status)}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(lead)}
                            className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => openDeleteModal(lead)}
                            className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-10 text-center">
                      No leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <AnimatePresence>
          {(showCreateModal || showEditModal) && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-5"
            >
              <motion.div
                initial={{
                  scale: 0.95,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                exit={{
                  scale: 0.95,
                  opacity: 0,
                }}
                className={`w-full max-w-xl rounded-[28px] border p-7 ${
                  darkMode
                    ? "bg-[#081028] border-white/10"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {showCreateModal ? "Add New Lead" : "Edit Lead"}
                    </h2>

                    <p
                      className={`mt-1 text-sm ${
                        darkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Phone must be exactly 10 digits.
                    </p>
                  </div>

                  <button
                    onClick={closeFormModal}
                    className="h-10 w-10 rounded-xl bg-slate-500/10 flex items-center justify-center"
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
                  <label className="block text-sm font-medium">
                    Full Name
                    <input
                      value={formData.name}
                      onChange={(event) => {
                        setFormData({
                          ...formData,
                          name: event.target.value,
                        });
                        setFormError("");
                      }}
                      className={`${inputClass} mt-2`}
                      placeholder="Divya Sharma"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Email
                    <input
                      value={formData.email}
                      onChange={(event) => {
                        setFormData({
                          ...formData,
                          email: event.target.value,
                        });
                        setFormError("");
                      }}
                      className={`${inputClass} mt-2`}
                      placeholder="divya@gmail.com"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Phone
                    <input
                      value={formData.phone}
                      onChange={(event) => {
                        setFormData({
                          ...formData,
                          phone: event.target.value,
                        });
                        setFormError("");
                      }}
                      className={`${inputClass} mt-2`}
                      placeholder="9876543210"
                    />

                    <span
                      className={`block mt-2 text-xs ${
                        darkMode ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      Example: 9876543210. 12 digits will be rejected.
                    </span>
                  </label>

                  <label className="block text-sm font-medium">
                    Status
                    <select
                      value={formData.status}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          status: event.target.value,
                        })
                      }
                      className={`${inputClass} mt-2`}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    onClick={showCreateModal ? handleCreateLead : handleUpdateLead}
                    className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium"
                  >
                    {showCreateModal ? "Create Lead" : "Save Changes"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDeleteModal && selectedLead && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-5"
            >
              <motion.div
                initial={{
                  scale: 0.95,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                exit={{
                  scale: 0.95,
                  opacity: 0,
                }}
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
                    className="h-11 px-5 rounded-2xl bg-slate-500/10"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleDeleteLead}
                    className="h-11 px-5 rounded-2xl bg-rose-600 text-white"
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