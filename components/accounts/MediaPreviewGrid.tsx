"use client"

import type { MediaAttachment } from "./account-manager"
import { FileText, Play, Plus, X } from "lucide-react"

export interface MediaPreviewGridProps {
  media: MediaAttachment[]
  isEditing?: boolean
  onViewGallery?: () => void
  onAddMedia?: (files: FileList) => void
  onDeleteMedia?: (fileId: string) => void
}

/**
 * Compact media preview grid for ledger rows
 * Shows up to 4 thumbnails in a 2×2 grid (56px each)
 * If more than 4 files exist, shows "+X more" overlay
 */
export function MediaPreviewGrid({
  media,
  isEditing = false,
  onViewGallery,
  onAddMedia,
  onDeleteMedia,
}: MediaPreviewGridProps) {
  const displayMedia = media.slice(0, 4)
  const overflowCount = media.length > 4 ? media.length - 4 : 0

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg bg-slate-50/60 px-2 py-2">
        <span className="text-[10px] font-black text-slate-400">No media</span>
        {!isEditing && onAddMedia && (
          <label className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-2 py-1 text-[9px] font-black text-blue-700 transition hover:bg-blue-100">
            <Plus size={10} />
            Add
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.xlsx,.xls,.docx,.doc"
              className="hidden"
              onChange={(e) => e.target.files && onAddMedia(e.target.files)}
              onClick={(e) => e.stopPropagation()}
            />
          </label>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Thumbnail grid: 2×2, 56px each */}
      <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-lg bg-slate-50/60 p-1.5">
        {displayMedia.map((file, index) => (
          <div
            key={file.id || `${file.name}-${index}`}
            className="group relative h-14 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-100 transition"
          >
            {/* Overlay on last thumb if overflow */}
            {index === 3 && overflowCount > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <span className="text-xs font-black text-white">+{overflowCount}</span>
              </div>
            )}

            {/* Media preview */}
            {file.type?.startsWith("image/") ? (
              <img
                src={file.dataUrl || file.url}
                alt="Thumbnail"
                className="h-full w-full object-cover"
              />
            ) : file.type?.startsWith("video/") ? (
              <>
                <video
                  src={file.dataUrl || file.url}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play size={18} className="fill-white text-white" />
                </div>
              </>
            ) : file.type?.includes("pdf") ? (
              <div className="flex h-full w-full items-center justify-center bg-red-50">
                <FileText size={24} className="text-red-600" />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-blue-50">
                <FileText size={24} className="text-blue-600" />
              </div>
            )}

            {/* Delete button on hover (only in edit mode) */}
            {isEditing && onDeleteMedia && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteMedia(file.id || file.name)
                }}
                className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-md bg-red-600 text-white opacity-0 transition group-hover:opacity-100"
                title="Delete"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Info footer: file count and quick actions */}
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[9px] font-black text-slate-500">
          {media.length} file{media.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-1">
          {onViewGallery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onViewGallery()
              }}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/80 px-1.5 py-0.5 text-[8px] font-black text-blue-700 transition hover:bg-blue-100"
            >
              View
            </button>
          )}
          {!isEditing && onAddMedia && (
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-blue-200 bg-blue-50/80 px-1.5 py-0.5 text-[8px] font-black text-blue-700 transition hover:bg-blue-100">
              <Plus size={9} />
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.xlsx,.xls,.docx,.doc"
                className="hidden"
                onChange={(e) => e.target.files && onAddMedia(e.target.files)}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  )
}
