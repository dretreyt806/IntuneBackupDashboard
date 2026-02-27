"use client"
import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2, ShieldCheck, Database, RefreshCw, AlertTriangle, History, X, RotateCcw } from "lucide-react"

const FUNCTION_KEY = import.meta.env.VITE_FUNCTION_KEY
const BASE_URL = "https://intunepolicybackups-eaa0b9gbeqb3haek.uksouth-01.azurewebsites.net/api"
const AUTH_QUERY = `code=${FUNCTION_KEY}`

interface Policy {
  id: string
  displayName?: string
  name?: string
  category?: string
}

interface Backup {
  backupId: string
  policyName: string
  rawName: string
  category: string
  backupDate: string
  blobPath: string
  timestamp: string
}

export default function IntuneBackupDashboard() {
  const [search, setSearch] = useState("")
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [statusMsg, setStatusMsg] = useState("")
  const [backingUpId, setBackingUpId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const [showHistory, setShowHistory] = useState(false)
  const [backups, setBackups] = useState<Backup[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [backupSearch, setBackupSearch] = useState("")
  const [historyTitle, setHistoryTitle] = useState("All Backups")

  useEffect(() => { fetchPolicies() }, [])

  const fetchPolicies = async () => {
    setLoading(true)
    setStatusMsg("")
    try {
      const response = await fetch(`${BASE_URL}/policies?${AUTH_QUERY}`)
      if (!response.ok) throw new Error(`Status: ${response.status}`)
      const data = await response.json()
      setPolicies(Array.isArray(data) ? data : data ? [data] : [])
    } catch (err) {
      setStatusMsg("Failed to load policies. Check CORS settings and Function Key.")
    } finally {
      setLoading(false)
    }
  }

  const fetchBackups = async (category?: string, policyName?: string) => {
    setBackupsLoading(true)
    setBackups([])
    try {
      // ✅ Build URL with both category and policyName filters for precise matching
      let url = `${BASE_URL}/backups?${AUTH_QUERY}`
      if (category)   url += `&category=${encodeURIComponent(category)}`
      if (policyName) url += `&policyName=${encodeURIComponent(policyName)}`

      const response = await fetch(url)
      if (!response.ok) throw new Error(`Status: ${response.status}`)
      const data = await response.json()
      setBackups(Array.isArray(data) ? data : data ? [data] : [])
    } catch (err) {
      console.error("Backups fetch error:", err)
    } finally {
      setBackupsLoading(false)
    }
  }

  const handleViewAllHistory = () => {
    setHistoryTitle("All Backups")
    setBackupSearch("")
    setShowHistory(true)
    fetchBackups()
  }

  const handleViewPolicyHistory = (policy: Policy) => {
    const name = policy.displayName || policy.name || ""
    // ✅ Pass sanitised name to match how Storage.psm1 names blobs
    const rawName = name.replace(/[^a-zA-Z0-9-]/g, "_")
    setHistoryTitle(`History: ${name}`)
    setBackupSearch("")
    setShowHistory(true)
    fetchBackups(policy.category, rawName)
  }

  const handleBackup = async (policyId: string, category?: string) => {
    setBackingUpId(policyId)
    try {
      const response = await fetch(`${BASE_URL}/backup?${AUTH_QUERY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyIds: [policyId], category: category || "DeviceConfiguration" })
      })
      if (response.ok) {
        alert(`Backup created successfully`)
      } else {
        const errorText = await response.text()
        alert(`Backup failed: ${errorText}`)
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`)
    } finally {
      setBackingUpId(null)
    }
  }

  const handleRestore = async (backup: Backup) => {
    if (!confirm(`Restore "${backup.policyName}" from ${new Date(backup.backupDate).toLocaleString("en-GB")}?`)) return
    setRestoringId(backup.backupId)
    try {
      const response = await fetch(`${BASE_URL}/restore?${AUTH_QUERY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ Send blobPath so RestorePolicy function can fetch the right blob
        body: JSON.stringify({ blobPath: backup.blobPath })
      })
      if (response.ok) {
        const result = await response.json()
        alert(`Restored successfully. New Policy ID: ${result.restoredPolicyId}`)
      } else {
        const errorText = await response.text()
        alert(`Restore failed: ${errorText}`)
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`)
    } finally {
      setRestoringId(null)
    }
  }

  const filteredPolicies = policies.filter(p =>
    (p.displayName || p.name || "").toLowerCase().includes(search.toLowerCase())
  )

  const filteredBackups = backups.filter(b =>
    (b.policyName || "").toLowerCase().includes(backupSearch.toLowerCase())
  )

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen font-sans text-slate-900">

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Intune Policy Backup</h1>
          <p className="text-slate-500 font-medium">Management Console</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleViewAllHistory}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm text-sm font-semibold"
          >
            <History className="h-4 w-4" />
            View All Backups
          </button>
          <button
            onClick={fetchPolicies}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition shadow-sm text-sm font-semibold text-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Sync from Graph
          </button>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        <input
          placeholder="Filter policies by name..."
          className="pl-11 w-full p-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {statusMsg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
          {filteredPolicies.length > 0 ? filteredPolicies.map((policy) => (
            <motion.div key={policy.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="group bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl group-hover:bg-blue-600 transition-colors">
                  <ShieldCheck className="h-6 w-6 text-blue-600 group-hover:text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest py-1 px-2.5 bg-slate-100 text-slate-500 rounded-lg">
                  {policy.category || "Policy"}
                </span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2 truncate">
                {policy.displayName || policy.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono mb-6 break-all opacity-60">{policy.id}</p>
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => handleBackup(policy.id, policy.category)}
                  disabled={backingUpId === policy.id}
                  className="flex-[2] bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold hover:bg-blue-600 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  {backingUpId === policy.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {backingUpId === policy.id ? "Processing..." : "Run Backup"}
                </button>
                <button
                  onClick={() => handleViewPolicyHistory(policy)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-1 active:scale-95"
                >
                  <History className="h-4 w-4" />
                  History
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-300 rounded-3xl">
              <p className="text-slate-400 font-medium">No policies found.</p>
            </div>
          )}
        </div>
      )}

      {/* Backup History Panel */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/30 z-40"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="flex justify-between items-start p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{historyTitle}</h2>
                  <p className="text-sm text-slate-500 mt-1">{backups.length} backup{backups.length !== 1 ? "s" : ""} found</p>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 rounded-xl transition">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="px-6 py-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    placeholder="Filter backups..."
                    className="pl-10 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={backupSearch}
                    onChange={(e) => setBackupSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {backupsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 opacity-30" />
                    <p className="text-slate-400 text-sm animate-pulse">Loading backups...</p>
                  </div>
                ) : filteredBackups.length > 0 ? (
                  filteredBackups.map((backup) => (
                    <motion.div key={backup.backupId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:border-blue-300 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-widest py-0.5 px-2 bg-blue-100 text-blue-600 rounded-md">
                            {backup.category}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mt-1 truncate">{backup.policyName}</h4>
                          <p className="text-xs text-slate-400 font-mono mt-1 truncate opacity-60">{backup.blobPath}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center gap-3">
                        <span className="text-xs text-slate-500">
                          {new Date(backup.backupDate).toLocaleString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                        {/* ✅ Restore button */}
                        <button
                          onClick={() => handleRestore(backup)}
                          disabled={restoringId === backup.backupId}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 disabled:opacity-50 transition-all active:scale-95"
                        >
                          {restoringId === backup.backupId
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <RotateCcw className="h-3 w-3" />
                          }
                          {restoringId === backup.backupId ? "Restoring..." : "Restore"}
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <Database className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium text-sm">No backups found.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <footer className="pt-8 border-t border-slate-200 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
        <span>System Status: Healthy</span>
        <span>Version 1.0.8 - 2026 Build</span>
      </footer>
    </div>
  )
}
