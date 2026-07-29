import type { ReactNode } from 'react';

export type IconName =
  | 'FileText'
  | 'Sparkles'
  | 'UserCheck'
  | 'UploadCloud'
  | 'History'
  | 'SlidersHorizontal'
  | 'Building2'
  | 'Mail'
  | 'Flag'
  | 'AlertTriangle'
  | 'CheckCircle2'
  | 'Check'
  | 'XCircle'
  | 'X'
  | 'Plus'
  | 'Trash2'
  | 'Loader2'
  | 'ChevronDown'
  | 'ChevronUp'
  | 'ShieldCheck'
  | 'User'
  | 'Users'
  | 'Send'
  | 'Search'
  | 'RefreshCw'
  | 'ChevronLeft'
  | 'ChevronRight'
  | 'MessageSquare'
  | 'PanelLeft';

/** SVG children for each icon (24×24 viewBox, stroke = currentColor). */
export const ICON_PATHS: Record<IconName, ReactNode> = {
  FileText: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </>
  ),
  Sparkles: (
    <>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </>
  ),
  UserCheck: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3-7 7-7s7 3 7 7" />
      <path d="M17 12l2 2 3-4" />
    </>
  ),
  UploadCloud: (
    <>
      <path d="M7 18a5 5 0 0 1-1-9.9A6 6 0 0 1 17.7 8H18a4 4 0 0 1 1 7.9" />
      <path d="M12 12v7" />
      <path d="M9 15l3-3 3 3" />
    </>
  ),
  History: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  SlidersHorizontal: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="9" cy="7" r="2" />
      <line x1="4" y1="14" x2="20" y2="14" />
      <circle cx="16" cy="14" r="2" />
      <line x1="4" y1="21" x2="20" y2="21" />
      <circle cx="11" cy="21" r="2" />
    </>
  ),
  Building2: (
    <>
      <rect x="4" y="3" width="16" height="18" />
      <line x1="9" y1="8" x2="9" y2="8" />
      <line x1="9" y1="12" x2="9" y2="12" />
      <line x1="9" y1="16" x2="9" y2="16" />
      <line x1="15" y1="8" x2="15" y2="8" />
      <line x1="15" y1="12" x2="15" y2="12" />
      <line x1="15" y1="16" x2="15" y2="16" />
    </>
  ),
  Mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  Flag: (
    <>
      <path d="M5 3v18" />
      <path d="M5 4h13l-3 4 3 4H5" />
    </>
  ),
  AlertTriangle: (
    <>
      <path d="M12 3L2 20h20z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <line x1="12" y1="17.2" x2="12" y2="17.2" />
    </>
  ),
  CheckCircle2: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 5-5.5" />
    </>
  ),
  Check: <polyline points="5 12 10 17 20 7" />,
  XCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </>
  ),
  X: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  Plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  Trash2: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" />
      <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
      <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </>
  ),
  Loader2: <path d="M12 3a9 9 0 1 0 9 9" />,
  ChevronDown: <polyline points="6 9 12 15 18 9" />,
  ChevronUp: <polyline points="6 15 12 9 18 15" />,
  ShieldCheck: (
    <>
      <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  User: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </>
  ),
  Users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 21c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <circle cx="17" cy="7" r="2.5" />
      <path d="M15 13.2c3.3-.2 6 2.3 6 5.6" />
    </>
  ),
  Send: (
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  ),
  Search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </>
  ),
  RefreshCw: (
    <>
      <path d="M3 12a9 9 0 0 1 15.5-6.4L21 8" />
      <polyline points="21 3 21 8 16 8" />
      <path d="M21 12a9 9 0 0 1-15.5 6.4L3 16" />
      <polyline points="3 21 3 16 8 16" />
    </>
  ),
  ChevronLeft: <polyline points="15 6 9 12 15 18" />,
  ChevronRight: <polyline points="9 6 15 12 9 18" />,
  MessageSquare: <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  PanelLeft: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </>
  ),
};
