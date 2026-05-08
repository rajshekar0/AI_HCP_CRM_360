import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Chat from "./pages/Chat";
import Interaction from "./pages/Interaction";

function App() {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <BrowserRouter>
      <div className={`h-screen w-screen flex overflow-hidden transition-all duration-300 ${darkMode ? "bg-[#050816] text-white" : "bg-[#f5f7fb] text-slate-900"}`}>
        <aside className="h-screen shrink-0 overflow-hidden">
          <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />
        </aside>
        <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard darkMode={darkMode} />} />
            <Route path="/leads" element={<Leads darkMode={darkMode} />} />
            <Route path="/chat" element={<Chat darkMode={darkMode} />} />
            <Route path="/interaction" element={<Interaction darkMode={darkMode} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
