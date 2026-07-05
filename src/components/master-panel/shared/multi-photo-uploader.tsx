"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_SUPERVISOR_ATTACHMENT_PHOTOS } from "@/types/verification-workflow";

type Props = {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function MultiPhotoUploader({ photos, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = MAX_SUPERVISOR_ATTACHMENT_PHOTOS - photos.length;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || disabled) return;
    const files = Array.from(fileList).slice(0, remaining);
    const encoded = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
    onChange([...photos, ...encoded].slice(0, MAX_SUPERVISOR_ATTACHMENT_PHOTOS));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-corporate-text">
          Site attachment photos (up to {MAX_SUPERVISOR_ATTACHMENT_PHOTOS})
        </p>
        <span className="text-xs text-corporate-muted">
          {photos.length}/{MAX_SUPERVISOR_ATTACHMENT_PHOTOS} attached
        </span>
      </div>

      {photos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <div
              key={`${index}-${photo.slice(0, 24)}`}
              className="relative overflow-hidden rounded-xl border border-corporate-border bg-corporate-bg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={`Supervisor attachment ${index + 1}`}
                className="h-28 w-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(photos.filter((_, i) => i !== index))}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                  title="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && !disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-corporate-border px-5 py-3 text-sm font-medium text-corporate-brand hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
          >
            <ImagePlus className="h-4 w-4" />
            Add site photo{remaining > 1 ? "s" : ""} ({remaining} remaining)
          </button>
        </>
      )}
    </div>
  );
}
