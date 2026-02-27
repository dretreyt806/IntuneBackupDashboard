"use client"
import React, { useState } from "react"
import { motion } from "framer-motion"
import { Search, Shield, HardDrive, Activity } from "lucide-react"

export default function IntuneBackupDashboard() {
  const [search, setSearch] = useState("")

  const mockPolicies = [
    { id: "1", name: "Windows Security Baseline", type: "AdminTemplate", modified: "2026-02-20" },
    { id: "2", name: "Corporate Compliance", type: "Compliance", modified: "2026-02-18" },
    { id: "3", name: "Endpoint Hardening", type: "DeviceConfiguration", modified: "2026-02-15" },
    { id: "4", name: "Windows 11 Settings", type: "SettingsCatalog", modified: "2026-02-10" }
  ]

  const filteredPolicies = mockPolicies.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen font-sans">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Intune Policy Backup</h1>
        <p className="text-slate-500">Backup, restore, and manage Intune configuration policies</p>
      </motion.div>

      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search policies..."
            className="pl-10 w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition">
          Run Full Backup
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPolicies.map(policy => (
          <motion.div
            key={policy.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg text-slate-800">{policy.name}</h3>
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                {policy.type}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-6">Last Modified: {policy.modified}</p>
            <div className="flex gap-2">
              <button className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-sm hover:bg-slate-800">Backup</button>
              <button className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">View</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
