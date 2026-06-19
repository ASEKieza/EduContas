"use client";

import React, { useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";

// ── Module-level z-counter ────────────────────────────────────────────────────
// All DraggableWindow instances share this counter so clicking any window
// always brings it above all others.
let _topZ = 2000;
function nextZ() { return ++_topZ; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSidebarWidth(): number {
  if (typeof window === "undefined") return 268;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--sidebar-width").trim();
  return parseInt(raw, 10) || 268;
}

// ── TLBtn ─────────────────────────────────────────────────────────────────────
function TLBtn({
  color, title, onClick, children,
}: {
  color: string; title: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`w-4 h-4 rounded-full flex items-center justify-center transition-all group shrink-0 ${color}`}
    >
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        {children}
      </span>
    </button>
  );
}

// ── DraggableWindow ───────────────────────────────────────────────────────────
export interface DraggableWindowProps {
  title: string;
  icon?: string;
  onClose: () => void;
  width?: number;
  height?: number;
  /** Extra class applied to the content area (default: "bg-white") */
  contentClass?: string;
  children: React.ReactNode;
}

export function DraggableWindow({
  title,
  icon,
  onClose,
  width = 800,
  height = 540,
  contentClass = "bg-white",
  children,
}: DraggableWindowProps) {
  // Centre within the content area (right of sidebar) on first render
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 40, y: 40 };
    const sw = getSidebarWidth();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      x: Math.max(0, Math.floor((vw - sw - width) / 2)),
      y: Math.max(0, Math.floor((vh - height) / 3)),
    };
  });

  const [myZ, setMyZ] = useState(() => nextZ());
  const [maximized, setMaximized] = useState(false);

  const drag = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  const bringToFront = useCallback(() => {
    setMyZ(nextZ());
  }, []);

  const onTitlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (maximized) return;
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      bringToFront();
      drag.current = {
        on: true,
        sx: e.clientX,
        sy: e.clientY,
        ox: pos.x,
        oy: pos.y,
      };
    },
    [maximized, pos.x, pos.y, bringToFront]
  );

  const onTitlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d.on) return;
      const sw = getSidebarWidth();
      const nx = Math.max(
        0,
        Math.min(window.innerWidth - sw - 120, d.ox + (e.clientX - d.sx))
      );
      const ny = Math.max(
        0,
        Math.min(window.innerHeight - 44, d.oy + (e.clientY - d.sy))
      );
      setPos({ x: nx, y: ny });
    },
    []
  );

  const onTitlePointerUp = useCallback(() => {
    drag.current.on = false;
  }, []);

  if (typeof document === "undefined") return null;

  const sw = getSidebarWidth();
  const style: React.CSSProperties = maximized
    ? { position: "fixed", left: sw, top: 0, right: 0, bottom: 0, zIndex: myZ }
    : {
        position: "fixed",
        left: sw + pos.x,
        top: pos.y,
        width,
        height,
        zIndex: myZ,
      };

  const content = (
    <div
      style={{
        ...style,
        borderRadius: maximized ? 0 : "12px",
        border: "1px solid rgba(0,0,0,0.12)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.15)",
      }}
      className="flex flex-col overflow-hidden"
      onPointerDown={bringToFront}
    >
      {/* ── Title bar ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 shrink-0 select-none"
        style={{
          height: 40,
          background: "linear-gradient(180deg, #2d2f3d 0%, #1e1f2b 100%)",
          cursor: maximized ? "default" : "grab",
          userSelect: "none",
        }}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
      >
        {/* Traffic-light — macOS convention */}
        <div className="flex items-center gap-1.5 shrink-0 mr-1">
          <TLBtn
            color="bg-red-500 hover:bg-red-600 shadow-sm"
            title="Fechar"
            onClick={onClose}
          >
            <svg className="w-2.5 h-2.5 text-red-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={1.8}>
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </TLBtn>

          {/* Maximizar / Restaurar */}
          <TLBtn
            color="bg-green-500 hover:bg-green-600 shadow-sm"
            title={maximized ? "Restaurar" : "Maximizar"}
            onClick={() => setMaximized(v => !v)}
          >
            {maximized ? (
              <svg className="w-2.5 h-2.5 text-green-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={1.8}>
                <path d="M3 1H1v2M7 1h2v2M1 7v2h2M9 7v2H7" />
                <path d="M3 3h4v4H3z" />
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5 text-green-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={1.8}>
                <path d="M1 3V1h2M7 1h2v2M9 7v2H7M3 9H1V7" />
              </svg>
            )}
          </TLBtn>
        </div>

        {icon && <span className="text-sm shrink-0 leading-none">{icon}</span>}
        <span className="flex-1 text-[12px] font-semibold truncate text-white/90 pointer-events-none">
          {title}
        </span>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className={`flex-1 overflow-auto ${contentClass}`}>
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
