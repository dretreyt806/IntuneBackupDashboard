"use client"
import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Loader2, ShieldCheck, Database, RefreshCw, AlertTriangle } from "lucide-react"

const FUNCTION_KEY = import.meta.env.VITE_FUNCTION_KEY;
const BASE_URL = "https://intunepolicybackups-eaa0b9gbeqb3haek.uksouth-01.azurewebsites.net/api";
const AUTH_QUERY = `code=${FUNCTION_KEY}`;

export default function IntuneBackupDashboard() {
  const [search, setSearch] = useState("")
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMsg, setStatusMsg] = useState("")
  const [backingUpId, setBackingUpId] = useState(null)

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    setStatusMsg("");
    try {
      const response = await fetch(`${BASE_URL}/policies?${AUTH_QUERY}`);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      setPolicies(Array.isArray(data) ? data : data ? [data] : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setStatusMsg("Failed to load policies. Check CORS settings and Function Key.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async (policyId, category) => {
    setBackingUpId(policyId);
    try {
      const response = await fetch(`${BASE_URL}/backup?${AUTH_QUERY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyIds: [policyId],
          // ✅ Use category from the policy object (matches your Graph.psm1 output)
          category: category || "DeviceConfiguration"
        })
      });

      if (response.ok) {
        alert(`Success: Backup created for ${policyId}`);
      } else {
        const errorText = await response.text();
        alert(`Backup failed: ${errorText}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setBackingUpId(null);
    }
  };

  const filtered = policies.filter(p => {
    const name = p.displayName || p.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Intune Policy Backup</h1>
          <p className="text-slate-500 font-medium">Management Console</p>
        </div>
        <button
          onClick={fetchPolicies}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition shadow-sm text-sm font-semibold text-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Sync from Graph
        </button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        <input
          placeholder="Filter policies by name..."
          className="pl-11 w-full p-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {statusMsg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-800"
        >
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-sm font-medium">{statusMsg}</p>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 opacity-20" />
          <p className="text-slate-400 font-medium animate-pulse">Communicating with UK South Gateway...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.length > 0 ? (
            filtered.map((policy) => (
              <motion.div
                key={policy.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-blue-50 rounded-xl group-hover:bg-blue-600 transition-colors">
                    <ShieldCheck className="h-6 w-6 text-blue-600 group-hover:text-white" />
                  </div>
                  {/* ✅ Fixed: was policy.type, now policy.category to match Graph.psm1 */}
                  <span className="text-[10px] font-bold uppercase tracking-widest py-1 px-2.5 bg-slate-100 text-slate-500 rounded-lg">
                    {policy.category || "Policy"}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2 truncate">
                  {policy.displayName || policy.name}
                </h3>

                <p className="text-xs text-slate-400 font-mono mb-8 break-all opacity-60">
                  {policy.id}
                </p>

                <div className="flex gap-3 mt-auto">
                  <button
                    // ✅ Fixed: was policy.type, now policy.category
                    onClick={() => handleBackup(policy.id, policy.category)}
                    disabled={backingUpId === policy.id}
                    className="flex-[2] bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold hover:bg-blue-600 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    {backingUpId === policy.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                    {backingUpId === policy.id ? "Processing..." : "Run Backup"}
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-300 rounded-3xl">
              <p className="text-slate-400 font-medium">No policies found matching your search.</p>
            </div>
          )}
        </div>
      )}

      <footer className="pt-8 border-t border-slate-200 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
        <span>System Status: Healthy</span>
        <span>Version 1.0.5 - 2026 Build</span>
      </footer>
    </div>
  );
}
