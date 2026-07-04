"use client";

type ModuleListRecordLinkProps = {
  label: string;
  onOpen: () => void;
  className?: string;
};

export default function ModuleListRecordLink({
  label,
  onOpen,
  className = "",
}: ModuleListRecordLinkProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      className={`cursor-pointer text-left font-medium text-corporate-brand underline-offset-2 hover:text-corporate-brand/80 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-corporate-brand/40 ${className}`}
      title={`Open ${label}`}
    >
      {label}
    </button>
  );
}
