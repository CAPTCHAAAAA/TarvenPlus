/**
 * Minimal flat icons — filled style, no strokes.
 * Clean geometric shapes for modern UI.
 */

interface SFDotIconProps {
  name: SFDotIconName;
  className?: string;
  size?: number;
}

export type SFDotIconName =
  | "activity"
  | "refresh"
  | "download"
  | "trash"
  | "external"
  | "file"
  | "clock"
  | "type"
  | "rows"
  | "chevron-down"
  | "close"
  | "inbox";

// All icons use viewBox="0 0 24 24", fill="currentColor"
// Simple geometric shapes — minimal flat design
const ICON_PATHS: Record<SFDotIconName, React.ReactNode> = {
  // Solid circle with pulse dot
  activity: (
    <>
      <circle cx="12" cy="12" r="10" opacity="0.15" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),

  // Circular arrow
  refresh: (
    <path d="M12 4a8 8 0 1 1-6.4 3.2L6 9h4V5l-1.5 1.5A6 6 0 1 0 12 6V4z" />
  ),

  // Down arrow into tray
  download: (
    <>
      <path d="M12 16l-4-4h2.5V4h3v8H16l-4 4z" />
      <rect x="4" y="17" width="16" height="3" rx="1" />
    </>
  ),

  // Simple bin
  trash: (
    <>
      <rect x="6" y="7" width="12" height="13" rx="1" />
      <rect x="9" y="3" width="6" height="3" rx="1" />
      <rect x="4" y="6" width="16" height="2" rx="1" />
    </>
  ),

  // Arrow leaving box
  external: (
    <>
      <rect x="3" y="3" width="14" height="14" rx="2" opacity="0.3" />
      <path d="M14 10V4h6v6h-2V7l-6 6-2-2 6-6h-2z" />
    </>
  ),

  // Document with lines
  file: (
    <>
      <path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <rect x="8" y="10" width="8" height="2" rx="0.5" opacity="0.5" />
      <rect x="8" y="14" width="6" height="2" rx="0.5" opacity="0.5" />
    </>
  ),

  // Clock face
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),

  // Letter T with size indicator
  type: (
    <>
      <rect x="4" y="4" width="8" height="2" rx="0.5" />
      <rect x="7" y="4" width="2" height="10" rx="0.5" />
      <rect x="14" y="8" width="2" height="6" rx="0.5" />
      <rect x="14" y="8" width="5" height="2" rx="0.5" />
    </>
  ),

  // Three horizontal bars
  rows: (
    <>
      <rect x="4" y="5" width="16" height="2" rx="1" />
      <rect x="4" y="11" width="16" height="2" rx="1" />
      <rect x="4" y="17" width="16" height="2" rx="1" />
    </>
  ),

  // Simple chevron
  "chevron-down": (
    <path d="M6 9l6 6 6-6H6z" />
  ),

  // X mark
  close: (
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  ),

  // Inbox tray
  inbox: (
    <>
      <path d="M2 8h6l2 3h4l2-3h6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z" />
      <path d="M2 8l2-3h16l2 3" opacity="0.5" />
    </>
  ),
};

export function SFDotIcon({ name, className = "", size = 16 }: SFDotIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
