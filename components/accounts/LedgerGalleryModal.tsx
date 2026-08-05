"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Download, FileText, Trash2, X } from "lucide-react"
import type { MediaAttachment } from "./account-manager"

export interface LedgerGalleryModalProps {
  files: MediaAttachment[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onDelete?: (fileId: string) => void
  rowId?: string
}

/**
 * Premium gallery modal for viewing ledger media files
 * Supports images, videos, and PDF files with iOS/macOS glassmorphism styling
 */
export function LedgerGalleryModal({
  files,
  currentIndex = 0,
  isOpen,
  onClose,
  onDelete,
  rowId,
}: LedgerGalleryModalProps) {
  const [index, setIndex] = useState(currentIndex)
  const [deleting, setDeleting] = useState(false)

  if (!isOpen || !files.length) return null

  const currentFile = files[index]
  const hasMultiple = files.length > 1

  function goNext() {
    setIndex((i) => (i + 1) % files.length)
  }

  function goPrevious() {
    setIndex((i) => (i - 1 + files.length) % files.length)
  }

  function handleDelete() {
    if (!onDelete || deleting) return
    if (confirm(`Delete "${currentFile.name}"?`)) {
      setDeleting(true)
      onDelete(currentFile.id)
      setTimeout(() => {
        setDeleting(false)
        if (index > 0) setIndex(index - 1)
      }, 300)
    }
  }

  function handleDownload() {
    if (!currentFile.url) return
    const a = document.createElement("a")
    a.href = currentFile.url
    a.download = currentFile.originalName || currentFile.name || "download"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function formatBytes(bytes?: number) {
    if (!bytes) return "Unknown"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  function formatDate(dateString: string) {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(20px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60">
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 truncate">{currentFile.name}</h2>
            <p className="text-xs text-slate-500 mt-1">
              {formatBytes(currentFile.size)} • {formatDate(currentFile.uploadedAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Preview Area */}
        <div
          className="relative flex items-center justify-center bg-slate-50 overflow-hidden"
          style={{ minHeight: "400px" }}
        >
          {currentFile.kind === "image" && currentFile.url ? (
            <img
              src={currentFile.url}
              alt={currentFile.name}
              className="max-w-full max-h-full object-contain"
            />
          ) : currentFile.kind === "video" && currentFile.url ? (
            <video
              src={currentFile.url}
              controls
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: "400px" }}
            />
          ) : currentFile.kind === "document" || currentFile.type === "application/pdf" ? (
            <div className="flex flex-col items-center justify-center gap-4 text-slate-500">
              <FileText className="w-16 h-16 text-slate-400" />
              <p className="text-sm font-medium">{currentFile.originalName || currentFile.name}</p>
              <p className="text-xs">{formatBytes(currentFile.size)}</p>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Open PDF
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
              <FileText className="w-12 h-12" />
              <p className="text-sm">File not available</p>
            </div>
          )}

          {/* Navigation Buttons */}
          {hasMultiple && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goPrevious()
                }}
                className="absolute left-4 p-2 bg-white/80 hover:bg-white rounded-lg transition shadow-lg"
                title="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-slate-900" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goNext()
                }}
                className="absolute right-4 p-2 bg-white/80 hover:bg-white rounded-lg transition shadow-lg"
                title="Next"
              >
                <ChevronRight className="w-5 h-5 text-slate-900" />
              </button>
            </>
          )}

          {/* Counter */}
          {hasMultiple && (
            <div className="absolute top-4 right-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur">
              {index + 1} / {files.length}
            </div>
          )}
        </div>

        {/* Thumbnail Grid */}
        {hasMultiple && (
          <div className="px-6 py-4 border-t border-slate-200/60 overflow-x-auto">
            <div className="flex gap-3">
              {files.map((file, i) => (
                <button
                  key={file.id}
                  onClick={() => setIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                    i === index
                      ? "border-blue-500 shadow-md"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  title={file.name}
                >
                  {file.kind === "image" && file.url ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.kind === "video" && file.url ? (
                    <video
                      src={file.url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/60 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            {rowId && <span>Row ID: {rowId.slice(0, 8)}</span>}
          </div>
          <div className="flex gap-2">
            {currentFile.kind !== "document" && currentFile.type !== "application/pdf" && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition text-sm font-medium"
                title="Download"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
