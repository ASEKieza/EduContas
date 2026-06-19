"use client";

import { useWindowManager } from "@/lib/windowManager";

/**
 * Floating taskbar that shows minimized windows at the bottom of the content area.
 * Constrained to the right of the sidebar.
 */
export function WindowTaskbar({ sidebarWidth }: { sidebarWidth: number }) {
  const { windows, focusWindow, closeWindow } = useWindowManager();
  const minimized = windows.filter(w => w.minimized);

  if (minimized.length === 0) return null;

  return (
    <div
      style={{ left: sidebarWidth + 16, bottom: 16, zIndex: 300 }}
      className="fixed flex flex-wrap gap-2 pointer-events-none"
    >
      {minimized.map(w => (
        <div
          key={w.id}
          className="pointer-events-auto flex items-center gap-2 bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors"
          style={{ maxWidth: 200 }}
        >
          <button
            onClick={() => focusWindow(w.id)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold flex-1 truncate"
            title={w.title}
          >
            {w.icon && <span className="text-sm">{w.icon}</span>}
            <span className="truncate">{w.title}</span>
          </button>
          <button
            onClick={() => closeWindow(w.id)}
            className="px-2 py-2 text-gray-400 hover:text-white transition-colors"
            title="Fechar"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
