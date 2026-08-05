"use client"

import { FileImage, FileText, FileVideo, FileSpreadsheet, Plus } from "lucide-react"
import type { MediaAttachment } from "./account-manager"

export interface MediaGridProps {
  media: MediaAttachment[]
  onView: (index: number) => void
  onAdd: (files: FileList) => void
  onDelete: (mediaId: string) => void
  rowId: string
  maxVisible?: number
  density?: "compact" | "medium" | "comfortable"
}

/**
 * Compact media thumbnail grid for ledger rows.
 * Thumbnails are FIXED pixel dimensions — they will NEVER expand the row.
 * Videos show an icon placeholder instead of loading inline.
 * Clicking opens the gallery modal.
 */
export function MediaGrid({
  media,
  onView,
  onAdd,
  onDelete,
  rowId,
  maxVisible = 4,
  density = "medium",
}: MediaGridProps) {
  const THUMB_W = density === "compact" ? 72 : density === "comfortable" ? 96 : 80
  const THUMB_H = density === "compact" ? 54 : density === "comfortable" ? 70 : 60

  const visibleMedia = media.slice(0, maxVisible)
  const moreCount = media.length - maxVisible
  const hasMore = moreCount > 0

  function getFileIcon(kind: string) {
    switch (kind) {
      case "image":
        return <FileImage className="w-4 h-4 text-blue-400" />
      case "video":
        return <FileVideo className="w-4 h-4 text-purple-400" />
      case "document":
        return <FileText className="w-4 h-4 text-orange-400" />
      default:
        return <FileSpreadsheet className="w-4 h-4 text-green-400" />
    }
  }

  const thumbStyle: React.CSSProperties = {
    position: "relative",
    width: THUMB_W,
    height: THUMB_H,
    flexShrink: 0,
    borderRadius: 5,
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }

  if (!media.length) {
    return (
      <label
        className="ledger-media-no-media"
        style={{ cursor: "pointer" }}
        title="Click to add media"
      >
        <Plus className="w-3 h-3" />
        <span>Add</span>
        <input
          type="file"
          multiple
          accept="image/*,video/*,.pdf"
          className="hidden"
          onChange={(e) => e.target.files && onAdd(e.target.files)}
        />
      </label>
    )
  }

  return (
    <div className="ledger-media-thumb-grid">
      {visibleMedia.map((file, index) => (
        <div
          key={file.id}
          className="ledger-media-thumb"
          style={thumbStyle}
          onClick={() => onView(index)}
          title={file.name}
        >
          {file.kind === "image" && file.url ? (
            <img
              src={file.url}
              alt={file.name}
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : file.kind === "video" ? (
            /* Show icon placeholder for videos — never load inline video in table */
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#1e293b",
              }}
            >
              <FileVideo className="w-5 h-5 text-white/70" />
            </div>
          ) : (
            <div className="ledger-media-thumb-icon">{getFileIcon(file.kind)}</div>
          )}

          {/* "+X more" overlay on last visible item if there are hidden items */}
          {hasMore && index === maxVisible - 1 && (
            <div className="ledger-media-thumb-overlay">+{moreCount}</div>
          )}
        </div>
      ))}

      {/* Add more button */}
      <label
        className="ledger-media-add-btn"
        style={{ width: THUMB_W, height: THUMB_H }}
        title="Add media"
      >
        <Plus className="w-3 h-3 text-blue-400" />
        <input
          type="file"
          multiple
          accept="image/*,video/*,.pdf"
          className="hidden"
          onChange={(e) => e.target.files && onAdd(e.target.files)}
        />
      </label>
    </div>
  )
}
