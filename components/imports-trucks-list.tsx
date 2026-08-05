"use client"

import React, { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import TruckIcon from "@/components/icons/TruckIcon"
import { Building2, Copy, Edit, Eye, Plus, Printer, Save, Trash2, X } from "lucide-react"

type AccountType = "import" | "export" | "both"

type TruckAccount = {
  id: string
  companyName: string
  address: string
  contact: string
  type: AccountType
}

const ACCOUNTS_STORAGE_KEY = "sky_accounts_manager_accounts"

const emptyAccount: Omit<TruckAccount, "id"> = {
  companyName: "",
  address: "",
  contact: "",
  type: "import",
}

export default function ImportsTrucksList({ onClose }: { onClose?: () => void }) {
  const [rows, setRows] = useState<any[]>(() => [])
  const [accounts, setAccounts] = useState<TruckAccount[]>([])
  const [query, setQuery] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
  const [newAccount, setNewAccount] = useState(emptyAccount)

  useEffect(() => {
    const stored = window.localStorage.getItem("imports-trucks-data")
    if (stored) setRows(JSON.parse(stored))
    const storedAccounts = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    if (storedAccounts) setAccounts(JSON.parse(storedAccounts))
  }, [])

  useEffect(() => {
    window.localStorage.setItem("imports-trucks-data", JSON.stringify(rows))
  }, [rows])

  useEffect(() => {
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
  }, [accounts])

  const addNew = () => {
    const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
    const newRow = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      accountId: selectedAccount?.id || "",
      accountName: selectedAccount?.companyName || "",
      driver: "",
      container: "",
      track: "",
      phone: "",
      declaration: "",
      commodity: "",
      quantity: "",
      gw: "",
      bol: "",
      destination: "",
    }
    setRows((r) => [newRow, ...r])
  }

  const addAccount = () => {
    if (!newAccount.companyName.trim()) return

    const account: TruckAccount = {
      id: crypto.randomUUID(),
      companyName: newAccount.companyName.trim(),
      address: newAccount.address.trim(),
      contact: newAccount.contact.trim(),
      type: newAccount.type,
    }

    setAccounts((current) => [account, ...current])
    setSelectedAccountId(account.id)
    setNewAccount(emptyAccount)
    setIsAccountModalOpen(false)
  }

  const filtered = useMemo(() => {
    const accountFiltered = selectedAccountId ? rows.filter((row) => row.accountId === selectedAccountId) : rows
    if (!query.trim()) return accountFiltered
    const q = query.toLowerCase()
    return accountFiltered.filter((r) =>
      [r.accountName, r.driver, r.container, r.track, r.declaration, r.bol, r.destination].some((v) => String(v || "").toLowerCase().includes(q))
    )
  }, [rows, query, selectedAccountId])

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
  const selectedAccountLabel = selectedAccount ? selectedAccount.companyName : "All Import Truck Accounts"
  const previewDate = new Date().toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  const updateRow = (id: number, patch: any) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const deleteRow = (id: number) => setRows((r) => r.filter((x) => x.id !== id))
  const duplicateRow = (id: number) => setRows((r) => {
    const src = r.find((x) => x.id === id)
    if (!src) return r
    const copy = { ...src, id: Date.now() }
    return [copy, ...r]
  })

  const printTrucksList = () => {
    setIsPrintPreviewOpen(true)
    window.setTimeout(() => window.print(), 350)
  }

  return (
    <section className="max-w-full overflow-x-hidden rounded-[24px] border border-white/60 bg-white/66 p-3 shadow-xl shadow-blue-100/50 backdrop-blur-[26px]">
      <div className="flex max-w-full flex-col justify-between gap-3 min-[1180px]:flex-row min-[1180px]:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-2xl bg-linear-to-br from-[#2563EB] to-[#1D4ED8] p-2.5 text-white shadow-lg">
            <TruckIcon size={30} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black leading-tight">Imports Trucks List</h2>
            <p className="max-w-2xl text-xs font-semibold text-slate-600">Manage imported truck shipments, containers, declarations, drivers, and customs records.</p>
          </div>
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-1.5">
          <input
            placeholder="Search by B/L, Container, Driver, Track, Declaration, Customer"
            className="h-10 min-w-[220px] flex-1 rounded-2xl border border-white/60 bg-white/70 px-3 text-xs font-bold shadow-sm backdrop-blur outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 min-[1180px]:w-72 min-[1180px]:flex-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className="h-10 min-w-[210px] flex-1 rounded-2xl border border-white/60 bg-white/70 px-3 text-xs font-black text-slate-800 shadow-sm backdrop-blur outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 min-[1180px]:w-64 min-[1180px]:flex-none"
          >
            <option value="">All / No Account Selected</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.companyName} ({account.type})
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => setIsAccountModalOpen(true)} className="h-10 rounded-2xl border-blue-100 bg-white/78 px-3 text-xs font-black text-blue-700 shadow-sm">
            <Building2 className="h-4 w-4" />
            Add Account
          </Button>
          <Button variant="outline" onClick={() => setIsPrintPreviewOpen(true)} className="h-10 rounded-2xl border-blue-100 bg-white/78 px-3 text-xs font-black text-blue-700 shadow-sm">
            <Eye className="h-4 w-4" />
            Print Preview
          </Button>
          <Button variant="outline" onClick={printTrucksList} className="h-10 rounded-2xl border-[#D4AF37]/60 bg-[#D4AF37]/20 px-3 text-xs font-black text-slate-900 shadow-sm">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="default" onClick={addNew} className="h-10 rounded-2xl px-3 text-xs font-black">
            <Plus />
            Add Truck Row
          </Button>
        </div>
      </div>

      <div className="mt-3 rounded-[20px] border border-blue-100 bg-white/62 p-3 shadow-md shadow-blue-100/35 backdrop-blur-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">Account Options</p>
              <h3 className="truncate text-base font-black text-slate-950">
                {selectedAccount ? selectedAccount.companyName : "Select or create an account for imported truck rows"}
              </h3>
              <p className="line-clamp-2 text-xs font-semibold text-slate-500">
                {selectedAccount ? [selectedAccount.address, selectedAccount.contact].filter(Boolean).join(" | ") || "No address/contact saved" : "New rows can be linked to a customer, shipper, or import account."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-black text-slate-700">
            <div className="rounded-2xl bg-white/70 px-3 py-2">Accounts<br /><span className="text-blue-700">{accounts.length}</span></div>
            <div className="rounded-2xl bg-white/70 px-3 py-2">Linked Rows<br /><span className="text-blue-700">{rows.filter((row) => row.accountId).length}</span></div>
            <div className="rounded-2xl bg-white/70 px-3 py-2">Selected<br /><span className="text-blue-700">{selectedAccount ? "Yes" : "No"}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/50 bg-white/36 p-3 text-sm backdrop-blur transition hover:-translate-y-0.5">Total Trucks<br/><strong>{rows.length}</strong></div>
          <div className="rounded-2xl border border-white/50 bg-white/36 p-3 text-sm backdrop-blur transition hover:-translate-y-0.5">Total Containers<br/><strong>{rows.reduce((s, r) => s + (r.container ? 1 : 0), 0)}</strong></div>
          <div className="rounded-2xl border border-white/50 bg-white/36 p-3 text-sm backdrop-blur transition hover:-translate-y-0.5">Delivered<br/><strong>--</strong></div>
          <div className="rounded-2xl border border-white/50 bg-white/36 p-3 text-sm backdrop-blur transition hover:-translate-y-0.5">In Transit<br/><strong>--</strong></div>
        </div>

        <div className="max-w-full overflow-x-auto rounded-2xl border border-white/40 bg-white/26 p-2">
          <Table className="w-full min-w-[1080px] text-xs">
            <TableHeader>
              <tr>
                <TableHead>Account<br/><span className="text-xs text-slate-500">Company</span></TableHead>
                <TableHead>S.NO<br/><span className="text-xs text-slate-500">ردیف</span></TableHead>
                <TableHead>DATE<br/><span className="text-xs text-slate-500">تاریخ</span></TableHead>
                <TableHead>Driver Name<br/><span className="text-xs text-slate-500">نوم</span></TableHead>
                <TableHead>Container Number<br/><span className="text-xs text-slate-500">کانټینر</span></TableHead>
                <TableHead>TRACK NO<br/><span className="text-xs text-slate-500">NUMBER-PLATE</span></TableHead>
                <TableHead>Phone No.<br/><span className="text-xs text-slate-500">CONTACT NO</span></TableHead>
                <TableHead>Customs Declaration No<br/><span className="text-xs text-slate-500">Declaration No</span></TableHead>
                <TableHead>Commodity<br/><span className="text-xs text-slate-500">Commodity</span></TableHead>
                <TableHead>Quantity<br/><span className="text-xs text-slate-500">QUANTITY</span></TableHead>
                <TableHead>G.W<br/><span className="text-xs text-slate-500">G.W</span></TableHead>
                <TableHead>Bill of Lading No<br/><span className="text-xs text-slate-500">BILL OF LADING NO</span></TableHead>
                <TableHead>Destination<br/><span className="text-xs text-slate-500">Destination</span></TableHead>
                <TableHead>Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((row, idx) => (
                <TableRow key={row.id} className="group">
                  <TableCell>
                    <select
                      className="w-44 rounded-xl border border-blue-100 bg-white/70 px-2 py-1 text-xs font-black outline-none focus:border-blue-300"
                      value={row.accountId || ""}
                      onChange={(event) => {
                        const account = accounts.find((item) => item.id === event.target.value)
                        updateRow(row.id, { accountId: account?.id || "", accountName: account?.companyName || "" })
                      }}
                    >
                      <option value="">No account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.companyName}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <input className="w-28 bg-transparent" value={row.date} onChange={(e) => updateRow(row.id, { date: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <input className="w-40 bg-transparent" value={row.driver} onChange={(e) => updateRow(row.id, { driver: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <input className="w-36 bg-transparent" value={row.container} onChange={(e) => updateRow(row.id, { container: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <input className="w-32 bg-transparent" value={row.track} onChange={(e) => updateRow(row.id, { track: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <input className="w-32 bg-transparent" value={row.phone} onChange={(e) => updateRow(row.id, { phone: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <input className="w-40 bg-transparent" value={row.declaration} onChange={(e) => updateRow(row.id, { declaration: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <input className="w-36 bg-transparent" value={row.commodity} onChange={(e) => updateRow(row.id, { commodity: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <input className="w-24 bg-transparent" value={row.quantity} onChange={(e) => updateRow(row.id, { quantity: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <input className="w-20 bg-transparent" value={row.gw} onChange={(e) => updateRow(row.id, { gw: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <input className="w-36 bg-transparent" value={row.bol} onChange={(e) => updateRow(row.id, { bol: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <input className="w-36 bg-transparent" value={row.destination} onChange={(e) => updateRow(row.id, { destination: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                      <button title="View" onClick={() => alert("View not implemented yet")} className="rounded-full p-1 hover:bg-white/30"><Eye className="h-4 w-4"/></button>
                      <button title="Edit" onClick={() => alert("Edit inline") } className="rounded-full p-1 hover:bg-white/30"><Edit className="h-4 w-4"/></button>
                      <button title="Print" onClick={printTrucksList} className="rounded-full p-1 hover:bg-white/30"><Printer className="h-4 w-4"/></button>
                      <button title="Duplicate" onClick={() => duplicateRow(row.id) } className="rounded-full p-1 hover:bg-white/30"><Copy className="h-4 w-4"/></button>
                      <button title="Delete" onClick={() => deleteRow(row.id) } className="rounded-full p-1 hover:bg-white/30"><Trash2 className="h-4 w-4"/></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {isPrintPreviewOpen ? createPortal(
        <div data-print-root="true" data-import-trucks-print-preview="true" className="fixed inset-0 z-[2147483646] overflow-y-auto bg-slate-950/70 p-4 text-slate-950 backdrop-blur-md md:p-8">
          <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
            <div data-import-trucks-print-hidden="true" className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/92 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">Print Preview</p>
                <h3 className="text-2xl font-black text-slate-950">Imports Trucks List</h3>
                <p className="text-sm font-semibold text-slate-500">{selectedAccountLabel} - {filtered.length} record(s)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => window.print()} className="h-11 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-5 font-black text-white shadow-lg shadow-blue-100">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" onClick={() => setIsPrintPreviewOpen(false)} className="h-11 rounded-2xl border-blue-100 bg-white px-5 font-black text-slate-700">
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>

            <article data-import-trucks-print-sheet="true" className="min-h-[900px] rounded-[30px] border-2 border-[#D4AF37] bg-[linear-gradient(135deg,#ffffff,#fffdf4_58%,#f8fbff)] p-6 shadow-2xl shadow-slate-950/20 md:p-8">
              <header className="grid gap-5 rounded-[24px] border border-[#D4AF37]/60 bg-white/80 p-5 shadow-lg shadow-amber-100/50 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-2xl border border-blue-100 bg-white/85 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9b6d00]">Imports Trucks List</p>
                  <h1 className="mt-2 text-3xl font-black text-slate-950">Truck Shipment Records</h1>
                  <p className="mt-1 text-sm font-bold text-slate-600">{selectedAccountLabel}</p>
                </div>
                <div className="mx-auto flex h-28 w-44 items-center justify-center rounded-[32px] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3 shadow-xl shadow-blue-100">
                  <img src="/images/account-ledger-logo.png" alt="Company logo" className="h-full w-full object-contain" />
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white/85 p-4 text-left md:text-right">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9b6d00]">Sky Ariana & Balam Bar Baran</p>
                  <p className="mt-2 text-sm font-bold text-slate-700">Afghanistan Office</p>
                  <p className="text-sm font-semibold text-slate-600">Licence Number: 2401-2198</p>
                  <p className="text-sm font-semibold text-slate-600">Printed: {previewDate}</p>
                </div>
              </header>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-blue-100 bg-white/80 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Records</p>
                  <p className="mt-1 text-2xl font-black text-blue-700">{filtered.length}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white/80 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Containers</p>
                  <p className="mt-1 text-2xl font-black text-blue-700">{filtered.filter((row) => row.container).length}</p>
                </div>
                <div className="rounded-2xl border border-[#D4AF37]/60 bg-[#fff7dc] p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Account</p>
                  <p className="mt-1 truncate text-lg font-black text-slate-950">{selectedAccount ? selectedAccount.companyName : "All Accounts"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white/80 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Report Date</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{previewDate}</p>
                </div>
              </div>

              <section className="mt-6 overflow-hidden rounded-2xl border border-[#D4AF37]">
                <table className="w-full border-collapse text-[10px] md:text-xs">
                  <thead className="bg-[#f8d678] text-left text-slate-950">
                    <tr>
                      {["S.NO", "DATE", "ACCOUNT", "Driver Name", "Container Number", "TRACK NO", "Phone No.", "Declaration No", "Commodity", "Quantity", "G.W", "Bill of Lading No", "Destination"].map((heading) => (
                        <th key={heading} className="border-r border-[#D4AF37] px-2 py-3 font-black last:border-r-0">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length ? filtered.map((row, idx) => (
                      <tr key={row.id} className="border-t border-[#efd173] odd:bg-white even:bg-[#fff7dc]">
                        <td className="border-r border-[#efd173] px-2 py-3">{idx + 1}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.date || "-"}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.accountName || "-"}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.driver || "-"}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.container || "-"}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.track || "-"}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.phone || "-"}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.declaration || "-"}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.commodity || "-"}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.quantity || "-"}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.gw || "-"}</td>
                        <td className="border-r border-[#efd173] px-2 py-3">{row.bol || "-"}</td>
                        <td className="px-2 py-3">{row.destination || "-"}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={13} className="px-3 py-16 text-center text-sm font-black text-slate-500">
                          No import truck records yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>

              <footer className="mt-8 grid gap-4 border-t border-[#D4AF37]/70 pt-5 text-xs font-bold text-slate-700 md:grid-cols-3">
                <div>
                  <p className="font-black uppercase text-slate-950">Web</p>
                  <p>www.skyariana.com</p>
                  <p>www.balambarbaran.com</p>
                </div>
                <div>
                  <p className="font-black uppercase text-slate-950">Afghanistan Office</p>
                  <p>2nd Floor, Office No. 16, Shahidano Chowk</p>
                  <p>Etimad Rahmi Market, Afghanistan</p>
                </div>
                <div>
                  <p className="font-black uppercase text-slate-950">Contact</p>
                  <p>transport@skyariana.com | info@skyariana.com</p>
                  <p>PH: +93 700 6565 93 | +93 711 435 529</p>
                </div>
              </footer>
            </article>
          </div>
        </div>,
        document.body
      ) : null}

      {isAccountModalOpen ? createPortal(
        <div className="fixed inset-0 z-[2147483647] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_10%_10%,rgba(37,99,235,.16),transparent_32%),radial-gradient(circle_at_86%_88%,rgba(212,175,55,.20),transparent_34%),linear-gradient(135deg,#eef6ff,#ffffff_50%,#fff9e8)] text-slate-950">
          <header className="shrink-0 border-b border-blue-100/80 bg-white/82 px-4 py-5 shadow-lg shadow-blue-100/50 backdrop-blur-2xl md:px-8">
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-blue-100 bg-white text-blue-600 shadow-xl shadow-blue-100">
                  <Building2 className="h-7 w-7" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">New Account Option</p>
                  <h3 className="truncate text-3xl font-black text-slate-950 md:text-5xl">Add Account for Imports Trucks List</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Create an import account and link truck rows to the company.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-slate-700 shadow-sm transition hover:bg-red-50 hover:text-red-600"
                aria-label="Close add account screen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
            <div className="grid min-h-full gap-6 xl:grid-cols-[1fr_390px]">
              <div className="rounded-[34px] border border-white/80 bg-white/86 p-5 shadow-[0_30px_90px_rgba(37,99,235,.16)] backdrop-blur-2xl md:p-8">
                <div className="rounded-[28px] border border-blue-100 bg-gradient-to-r from-white via-blue-50/70 to-amber-50/60 p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">Company Setup</p>
                  <h4 className="mt-2 text-2xl font-black text-slate-950">Enter account details</h4>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    This account appears in Imports Trucks List and the Import/Export account selector.
                  </p>
                </div>

                <div className="mt-6 grid gap-5 rounded-[28px] border border-blue-100 bg-white/76 p-5 shadow-xl shadow-blue-100/50 backdrop-blur-xl md:grid-cols-2 md:p-7">
                  <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
                    Company / Customer Name
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-600" />
                      <input
                        value={newAccount.companyName}
                        onChange={(event) => setNewAccount((current) => ({ ...current, companyName: event.target.value }))}
                        placeholder="Enter company name"
                        className="h-16 w-full rounded-2xl border border-blue-100 bg-white pl-12 pr-4 text-base font-black text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </label>
                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    Address
                    <input
                      value={newAccount.address}
                      onChange={(event) => setNewAccount((current) => ({ ...current, address: event.target.value }))}
                      placeholder="Company address"
                      className="h-16 rounded-2xl border border-blue-100 bg-white px-4 text-base font-black text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    Contact
                    <input
                      value={newAccount.contact}
                      onChange={(event) => setNewAccount((current) => ({ ...current, contact: event.target.value }))}
                      placeholder="Phone or email"
                      className="h-16 rounded-2xl border border-blue-100 bg-white px-4 text-base font-black text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
                    Account Type
                    <select
                      value={newAccount.type}
                      onChange={(event) => setNewAccount((current) => ({ ...current, type: event.target.value as AccountType }))}
                      className="h-16 rounded-2xl border border-blue-100 bg-white px-4 text-base font-black text-slate-950 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="import">Import</option>
                      <option value="export">Export</option>
                      <option value="both">Both</option>
                    </select>
                  </label>
                </div>
              </div>

              <aside className="rounded-[34px] border border-white/80 bg-white/76 p-5 shadow-[0_24px_70px_rgba(15,23,42,.12)] backdrop-blur-2xl">
                <div className="rounded-[28px] bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-xl shadow-blue-200">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">Account Preview</p>
                  <h4 className="mt-4 break-words text-2xl font-black">{newAccount.companyName || "Company Name"}</h4>
                  <p className="mt-2 text-sm font-semibold text-blue-100">{newAccount.type.toUpperCase()}</p>
                </div>
                <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
                  <div className="rounded-2xl border border-blue-100 bg-white/78 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Address</p>
                    <p className="mt-1 break-words text-slate-800">{newAccount.address || "Company address"}</p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-white/78 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Contact</p>
                    <p className="mt-1 break-words text-slate-800">{newAccount.contact || "Phone or email"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 p-4 text-slate-800">
                    Saved accounts stay available in the truck row account selector.
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <footer className="shrink-0 border-t border-blue-100/80 bg-white/86 px-4 py-4 shadow-[0_-18px_55px_rgba(37,99,235,.12)] backdrop-blur-2xl md:px-8">
            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsAccountModalOpen(false)} className="h-12 rounded-2xl border-blue-100 bg-white px-6 font-black text-slate-700">
                Cancel
              </Button>
              <Button onClick={addAccount} disabled={!newAccount.companyName.trim()} className="h-12 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-8 font-black text-white shadow-lg shadow-blue-100">
                <Save className="h-4 w-4" />
                Save Account
              </Button>
            </div>
          </footer>
        </div>,
        document.body
      ) : null}
    </section>
  )
}
