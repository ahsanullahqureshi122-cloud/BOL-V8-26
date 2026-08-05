"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Download, FileSpreadsheet, Search, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type AccountRecord = {
  id: string
  name: string
  address: string
  contact: string
  type: "import" | "export" | "both"
  created_at: string
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let value = ""
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      quoted = !quoted
    } else if (char === "," && !quoted) {
      cells.push(value.trim().replace(/^"|"$/g, ""))
      value = ""
    } else {
      value += char
    }
  }

  cells.push(value.trim().replace(/^"|"$/g, ""))
  return cells
}

export function AccountTools({ mode }: { mode: "import" | "export" }) {
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const loadAccounts = async () => {
    const response = await fetch("/api/accounts")
    const result = await response.json()
    setAccounts(Array.isArray(result.data) ? result.data : [])
  }

  useEffect(() => {
    void loadAccounts()
  }, [])

  const filtered = useMemo(
    () => accounts.filter((account) => [account.name, account.address, account.contact, account.type].join(" ").toLowerCase().includes(query.toLowerCase())),
    [accounts, query]
  )

  const importFile = async (file: File) => {
    const text = await file.text()
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseCsvLine)

    const [, ...dataRows] = rows.length > 1 && rows[0].join(",").toLowerCase().includes("name") ? rows : [[], ...rows]
    const accountsToSave = dataRows.map((row) => ({
      name: row[0] || "",
      address: row[1] || "",
      contact: row[2] || "",
      type: (["import", "export", "both"].includes((row[3] || "").toLowerCase()) ? row[3].toLowerCase() : "both") as "import" | "export" | "both",
    }))

    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accounts: accountsToSave }),
    })
    const result = await response.json()

    if (!response.ok || !result.success) {
      toast.error("Import failed", { description: result.error || "Please check the file." })
      return
    }

    setAccounts(result.data)
    toast.success(`${accountsToSave.length} account row${accountsToSave.length === 1 ? "" : "s"} imported`)
  }

  const exportCsv = () => {
    const lines = [
      ["Name", "Address", "Contact", "Type"].join(","),
      ...filtered.map((account) =>
        [account.name, account.address, account.contact, account.type].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "accounts-export.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="overflow-hidden rounded-[28px] border-white/60 bg-white/65 shadow-2xl shadow-blue-100/70 backdrop-blur-2xl">
      <CardHeader className="border-b border-white/70 bg-white/70 p-4 backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-950">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-white/80 text-blue-600 shadow-lg shadow-blue-100">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            {mode === "import" ? "Import Accounts" : "Export Accounts"}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {mode === "import" ? (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void importFile(file)
                    event.target.value = ""
                  }}
                />
                <Button onClick={() => inputRef.current?.click()} className="rounded-xl bg-linear-to-r from-[#2563EB] to-[#1D4ED8] text-white">
                  <Upload className="h-4 w-4" />
                  Import CSV/Excel
                </Button>
              </>
            ) : (
              <Button onClick={exportCsv} className="rounded-xl bg-linear-to-r from-[#D4AF37] to-[#F4D03F] text-slate-950">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.12),transparent_32%),linear-gradient(135deg,#fff,rgba(244,208,63,.16),rgba(255,255,255,.7))] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search accounts" className="rounded-2xl border-white/70 bg-white/70 pl-9" />
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/65 shadow-xl shadow-blue-100/60 backdrop-blur-[20px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-blue-600 text-white">
                <tr>
                  <th className="p-3 text-left">Company Name</th>
                  <th className="p-3 text-left">Address</th>
                  <th className="p-3 text-left">Contact</th>
                  <th className="p-3 text-left">Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center font-semibold text-slate-500">
                      No accounts yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((account) => (
                    <tr key={account.id} className="border-t border-blue-100 hover:bg-blue-50/80">
                      <td className="p-3 font-black text-slate-950">{account.name}</td>
                      <td className="p-3 text-slate-600">{account.address}</td>
                      <td className="p-3 text-slate-600">{account.contact}</td>
                      <td className="p-3">
                        <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-1 text-xs font-black uppercase text-blue-700">
                          {account.type}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
