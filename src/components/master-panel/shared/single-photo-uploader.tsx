"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";

type Props = {
  label: string;
  photo: string;
  onChange: (photo: string) => void;
  disabled?: boolean;
  required?: boolean;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function SinglePhotoUploader({
  label,
  photo,
  onChange,
  disabled,
  required,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.[0] || disabled) return;
    const encoded = await readFileAsDataUrl(fileList[0]);
    onChange(encoded);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-corporate-text">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </p>

      {photo ? (
        <div className="relative max-w-xs overflow-hidden rounded-xl border border-corporate-border bg-corporate-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={label} className="h-36 w-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
              title="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full border border-dashed border-corporate-border px-5 py-3 text-sm font-medium text-corporate-brand hover:border-corporate-brand/40 hover:bg-corporate-brand/5 disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" />
            Upload photo
          </button>
        </>
      )}
    </div>
  );
}
