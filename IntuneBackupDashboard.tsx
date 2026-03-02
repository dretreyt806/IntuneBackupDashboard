"use client"
import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Loader2, ShieldCheck, Database, RefreshCw,
  AlertTriangle, History, X, RotateCcw, LayoutGrid, List,
  Settings, Shield, BookOpen, Sliders
} from "lucide-react"

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

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES: Record<string, {
  label: string
  icon: React.ReactNode
  color: string        // Tailwind bg for badge
  text: string         // Tailwind text for badge
  border: string       // hover border accent
  dot: string          // dot indicator
}> = {
  AdminTemplate: {
    label: "Admin Templates",
    icon: <BookOpen className="h-3.5 w-3.5" />,
    color: "bg-violet-100",
    text:  "text-violet-700",
    border:"hover:border-violet-300",
    dot:   "bg-violet-400",
  },
  DeviceConfiguration: {
    label: "Device Config",
    icon: <Settings className="h-3.5 w-3.5" />,
    color: "bg-blue-100",
    text:  "text-blue-700",
    border:"hover:border-blue-300",
    dot:   "bg-blue-400",
  },
  Compliance: {
    label: "Compliance",
    icon: <Shield className="h-3.5 w-3.5" />,
    color: "bg-emerald-100",
    text:  "text-emerald-700",
    border:"hover:border-emerald-300",
    dot:   "bg-emerald-400",
  },
  SettingsCatalog: {
    label: "Settings Catalog",
    icon: <Sliders className="h-3.5 w-3.5" />,
    color: "bg-amber-100",
    text:  "text-amber-700",
    border:"hover:border-amber-300",
    dot:   "bg-amber-400",
  },
AppProtection: {
  label: "App Protection",
  icon:  <ShieldCheck className="h-3.5 w-3.5" />,
  color: "bg-rose-100",
  text:  "text-rose-700",
  border:"hover:border-rose-300",
  dot:   "bg-rose-400",
},
PowerShellScript: {
  label: "PS Scripts",
  icon:  <Terminal className="h-3.5 w-3.5" />,
  color: "bg-slate-100",
  text:  "text-slate-700",
  border:"hover:border-slate-300",
  dot:   "bg-slate-500",
},
}

const ALL_TAB = "__all__"

function getCategoryConfig(cat?: string) {
  return CATEGORIES[cat ?? ""] ?? {
    label: cat ?? "Policy",
    icon:  <ShieldCheck className="h-3.5 w-3.5" />,
    color: "bg-slate-100",
    text:  "text-slate-600",
    border:"hover:border-slate-300",
    dot:   "bg-slate-400",
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function IntuneBackupDashboard() {
  const [search,       setSearch]       = useState("")
  const [policies,     setPolicies]     = useState<Policy[]>([])
  const [loading,      setLoading]      = useState(true)
  const [statusMsg,    setStatusMsg]    = useState("")
  const [backingUpId,  setBackingUpId]  = useState<string | null>(null)
  const [restoringId,  setRestoringId]  = useState<string | null>(null)
  const [viewMode,     setViewMode]     = useState<"grid" | "list">("grid")
  const [activeTab,    setActiveTab]    = useState(ALL_TAB)

  const [showHistory,   setShowHistory]   = useState(false)
  const [backups,       setBackups]       = useState<Backup[]>([])
  const [backupsLoading,setBackupsLoading]= useState(false)
  const [backupSearch,  setBackupSearch]  = useState("")
  const [historyTitle,  setHistoryTitle]  = useState("All Backups")

  useEffect(() => { fetchPolicies() }, [])

  const fetchPolicies = async () => {
    setLoading(true); setStatusMsg("")
    try {
      const res  = await fetch(`${BASE_URL}/policies?${AUTH_QUERY}`)
      if (!res.ok) throw new Error(`Status: ${res.status}`)
      const data = await res.json()
      setPolicies(Array.isArray(data) ? data : data ? [data] : [])
    } catch {
      setStatusMsg("Failed to load policies. Check CORS settings and Function Key.")
    } finally { setLoading(false) }
  }

  const fetchBackups = async (category?: string, policyName?: string) => {
    setBackupsLoading(true); setBackups([])
    try {
      let url = `${BASE_URL}/backups?${AUTH_QUERY}`
      if (category)   url += `&category=${encodeURIComponent(category)}`
      if (policyName) url += `&policyName=${encodeURIComponent(policyName)}`
      const res  = await fetch(url)
      if (!res.ok) throw new Error(`Status: ${res.status}`)
      const data = await res.json()
      setBackups(Array.isArray(data) ? data : data ? [data] : [])
    } catch (err) { console.error(err) }
    finally { setBackupsLoading(false) }
  }

  const handleViewAllHistory = () => {
    setHistoryTitle("All Backups"); setBackupSearch("")
    setShowHistory(true); fetchBackups()
  }

  const handleViewPolicyHistory = (policy: Policy) => {
    const name    = policy.displayName || policy.name || ""
    const rawName = name.replace(/[^a-zA-Z0-9-]/g, "_")
    setHistoryTitle(`History: ${name}`); setBackupSearch("")
    setShowHistory(true); fetchBackups(policy.category, rawName)
  }

  const handleBackup = async (policyId: string, category?: string) => {
    setBackingUpId(policyId)
    try {
      const res = await fetch(`${BASE_URL}/backup?${AUTH_QUERY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyIds: [policyId], category: category || "DeviceConfiguration" })
      })
      if (res.ok) alert("Backup created successfully")
      else        alert(`Backup failed: ${await res.text()}`)
    } catch (err: any) { alert(`Network error: ${err.message}`) }
    finally { setBackingUpId(null) }
  }

  const handleRestore = async (backup: Backup) => {
    if (!confirm(`Restore "${backup.policyName}" from ${new Date(backup.backupDate).toLocaleString("en-GB")}?`)) return
    setRestoringId(backup.backupId)
    try {
      const res = await fetch(`${BASE_URL}/restore?${AUTH_QUERY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobPath: backup.blobPath })
      })
      if (res.ok) {
        const result = await res.json()
        alert(`Restored. New Policy ID: ${result.restoredPolicyId}`)
      } else {
        alert(`Restore failed: ${await res.text()}`)
      }
    } catch (err: any) { alert(`Network error: ${err.message}`) }
    finally { setRestoringId(null) }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const allFiltered = policies.filter(p =>
    (p.displayName || p.name || "").toLowerCase().includes(search.toLowerCase())
  )

  // Build tab list from categories that actually exist
  const tabCategories = Object.keys(CATEGORIES).filter(cat =>
    allFiltered.some(p => p.category === cat)
  )

  const displayedPolicies = activeTab === ALL_TAB
    ? allFiltered
    : allFiltered.filter(p => p.category === activeTab)

  const filteredBackups = backups.filter(b =>
    (b.policyName || "").toLowerCase().includes(backupSearch.toLowerCase())
  )

  // ── Policy card (shared between grid/list) ────────────────────────────────
  const PolicyCard = ({ policy }: { policy: Policy }) => {
    const cfg  = getCategoryConfig(policy.category)
    const name = policy.displayName || policy.name || "—"
    const isBackingUp = backingUpId === policy.id

    if (viewMode === "list") {
      return (
        <motion.div
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`group flex items-center gap-4 bg-white border border-slate-200 ${cfg.border} px-4 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200`}
        >
          {/* Colour dot */}
          <span className={`flex-shrink-0 w-2 h-2 rounded-full ${cfg.dot}`} />

          {/* Name */}
          <span className="flex-1 font-semibold text-slate-800 text-sm truncate">{name}</span>

          {/* Category badge */}
          <span className={`hidden md:flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${cfg.color} ${cfg.text}`}>
            {cfg.icon}{cfg.label}
          </span>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handleViewPolicyHistory(policy)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
              title="View history"
            >
              <History className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleBackup(policy.id, policy.category)}
              disabled={isBackingUp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 disabled:bg-slate-200 transition-all"
            >
              {isBackingUp ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
              {isBackingUp ? "..." : "Backup"}
            </button>
          </div>
        </motion.div>
      )
    }

    // Grid card
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`group bg-white border border-slate-200 ${cfg.border} p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200`}
      >
        <div className="flex justify-between items-center mb-3">
          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${cfg.color} ${cfg.text}`}>
            {cfg.icon}{cfg.label}
          </span>
          <button
            onClick={() => handleViewPolicyHistory(policy)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 transition"
            title="View history"
          >
            <History className="h-3.5 w-3.5" />
          </button>
        </div>

        <h3 className="font-bold text-slate-800 text-sm leading-snug mb-1 line-clamp-2">{name}</h3>
        <p className="text-[10px] text-slate-400 font-mono truncate opacity-60 mb-4">{policy.id}</p>

        <button
          onClick={() => handleBackup(policy.id, policy.category)}
          disabled={isBackingUp}
          className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-600 disabled:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
        >
          {isBackingUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
          {isBackingUp ? "Processing..." : "Run Backup"}
        </button>
      </motion.div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans text-slate-900">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Intune Policy Backup</h1>
          <p className="text-slate-500 text-sm font-medium">Management Console</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleViewAllHistory}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold shadow-sm">
            <History className="h-4 w-4" /> View All Backups
          </button>
          <button onClick={fetchPolicies} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition text-sm font-semibold text-slate-700 shadow-sm">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Sync from Graph
          </button>
        </div>
      </header>

      {/* Search + view toggle */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search policies..."
            className="pl-10 w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Grid / List toggle */}
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 transition ${viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50"}`}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 transition ${viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50"}`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {statusMsg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-800">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium">{statusMsg}</p>
        </motion.div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 opacity-20" />
          <p className="text-slate-400 text-sm animate-pulse">Communicating with UK South Gateway...</p>
        </div>
      ) : (
        <>
          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div className="flex gap-1.5 flex-wrap">
            {/* All tab */}
            <button
              onClick={() => setActiveTab(ALL_TAB)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === ALL_TAB
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              All
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                activeTab === ALL_TAB ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {allFiltered.length}
              </span>
            </button>

            {tabCategories.map(cat => {
              const cfg   = getCategoryConfig(cat)
              const count = allFiltered.filter(p => p.category === cat).length
              const isActive = activeTab === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? `${cfg.color} ${cfg.text} shadow-sm`
                      : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {cfg.icon}
                  {cfg.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isActive ? "bg-black/10" : "bg-slate-100 text-slate-500"
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Policy list/grid ───────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {displayedPolicies.length > 0 ? (
              <motion.div
                key={`${activeTab}-${viewMode}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "flex flex-col gap-2"
                }
              >
                {displayedPolicies.map(policy => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-20 text-center bg-white border border-dashed border-slate-300 rounded-3xl"
              >
                <p className="text-slate-400 font-medium text-sm">No policies found.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── Backup history slide-over ────────────────────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/30 z-40" />

            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="flex justify-between items-start p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{historyTitle}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {backups.length} backup{backups.length !== 1 ? "s" : ""} found
                  </p>
                </div>
                <button onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition">
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
                    onChange={e => setBackupSearch(e.target.value)}
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
                  filteredBackups.map(backup => {
                    const cfg = getCategoryConfig(backup.category)
                    return (
                      <motion.div key={backup.backupId}
                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:border-blue-300 transition-all"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest py-0.5 px-2 rounded-md ${cfg.color} ${cfg.text}`}>
                              {cfg.icon}{cfg.label}
                            </span>
                            <h4 className="font-bold text-slate-800 text-sm mt-1 truncate">{backup.policyName}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate opacity-60">{backup.blobPath}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center gap-3">
                          <span className="text-xs text-slate-500">
                            {new Date(backup.backupDate).toLocaleString("en-GB", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
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
                    )
                  })
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

      <footer className="pt-6 border-t border-slate-200 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
        <span>System Status: Healthy</span>
        <span>Version 1.0.9 - 2026 Build</span>
      </footer>
    </div>
  )
}
