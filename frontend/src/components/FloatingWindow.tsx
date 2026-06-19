"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { WindowDef, useWindowManager } from "@/lib/windowManager";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSidebarWidth(): number {
  if (typeof window === "undefined") return 268;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--sidebar-width").trim();
  return parseInt(raw, 10) || 268;
}

// ── Title-bar icon buttons ────────────────────────────────────────────────────

function TLBtn({ color, title, onClick, children }: {
  color: string; title: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onPointerDown={e => { e.stopPropagation(); }}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`w-4 h-4 rounded-full flex items-center justify-center transition-all group shrink-0 ${color}`}
    >
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        {children}
      </span>
    </button>
  );
}

// ── Resize handle descriptors ─────────────────────────────────────────────────

const HANDLES: { h: string; style: React.CSSProperties }[] = [
  { h: "nw", style: { top: 0,   left: 0,    width: 12, height: 12, cursor: "nw-resize"  } },
  { h: "n",  style: { top: 0,   left: 12,   right: 12, height: 6,  cursor: "n-resize"   } },
  { h: "ne", style: { top: 0,   right: 0,   width: 12, height: 12, cursor: "ne-resize"  } },
  { h: "e",  style: { top: 12,  right: 0,   bottom: 12, width: 6,  cursor: "e-resize"   } },
  { h: "se", style: { bottom: 0, right: 0,  width: 12, height: 12, cursor: "se-resize"  } },
  { h: "s",  style: { bottom: 0, left: 12,  right: 12, height: 6,  cursor: "s-resize"   } },
  { h: "sw", style: { bottom: 0, left: 0,   width: 12, height: 12, cursor: "sw-resize"  } },
  { h: "w",  style: { top: 12,  left: 0,    bottom: 12, width: 6,  cursor: "w-resize"   } },
];

// ── FloatingWindow ─────────────────────────────────────────────────────────────

interface FloatingWindowProps {
  win: WindowDef;
}

const MIN_W = 320;
const MIN_H = 200;

export function FloatingWindow({ win }: FloatingWindowProps) {
  const {
    closeWindow, focusWindow,
    minimizeWindow, maximizeWindow, restoreWindow,
    moveWindow, moveAndResizeWindow,
  } = useWindowManager();

  // ── Drag state ──────────────────────────────────────────────────────────────
  const drag = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const moveRef = useRef(moveWindow);
  useEffect(() => { moveRef.current = moveWindow; }, [moveWindow]);

  const onTitlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (win.maximized) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    focusWindow(win.id);
    drag.current = { on: true, sx: e.clientX, sy: e.clientY, ox: win.x, oy: win.y };
  }, [win.id, win.x, win.y, win.maximized, focusWindow]);

  const onTitlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on) return;
    const sw = getSidebarWidth();
    const nx = Math.max(0, Math.min(window.innerWidth - sw - 120, d.ox + (e.clientX - d.sx)));
    const ny = Math.max(0, Math.min(window.innerHeight - 44, d.oy + (e.clientY - d.sy)));
    moveRef.current(win.id, nx, ny);
  }, [win.id]);

  const onTitlePointerUp = useCallback(() => { drag.current.on = false; }, []);

  // ── Resize state ────────────────────────────────────────────────────────────
  const resize = useRef({ on: false, handle: "", sx: 0, sy: 0, ox: 0, oy: 0, ow: 0, oh: 0 });
  const marRef = useRef(moveAndResizeWindow);
  useEffect(() => { marRef.current = moveAndResizeWindow; }, [moveAndResizeWindow]);

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    focusWindow(win.id);
    resize.current = {
      on: true, handle,
      sx: e.clientX, sy: e.clientY,
      ox: win.x, oy: win.y,
      ow: win.width, oh: win.height,
    };
  }, [win.id, win.x, win.y, win.width, win.height, focusWindow]);

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const r = resize.current;
    if (!r.on) return;
    const dx = e.clientX - r.sx;
    const dy = e.clientY - r.sy;
    let nx = r.ox, ny = r.oy, nw = r.ow, nh = r.oh;

    if (r.handle.includes("e")) nw = Math.max(MIN_W, r.ow + dx);
    if (r.handle.includes("s")) nh = Math.max(MIN_H, r.oh + dy);
    if (r.handle.includes("w")) {
      const w2 = Math.max(MIN_W, r.ow - dx);
      nx = r.ox + (r.ow - w2);
      nw = w2;
    }
    if (r.handle.includes("n")) {
      const h2 = Math.max(MIN_H, r.oh - dy);
      ny = r.oy + (r.oh - h2);
      nh = h2;
    }
    marRef.current(win.id, nx, ny, nw, nh);
  }, [win.id]);

  const onResizePointerUp = useCallback(() => { resize.current.on = false; }, []);

  // ── Computed style ──────────────────────────────────────────────────────────
  const sw = getSidebarWidth();
  const style: React.CSSProperties = win.maximized
    ? { position: "fixed", left: sw, top: 0, right: 0, bottom: 0, zIndex: win.zIndex }
    : { position: "fixed", left: sw + win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex };

  const content = (
    <div
      style={{
        ...style,
        borderRadius: win.maximized ? 0 : "12px",
        border: "1px solid rgba(0,0,0,0.12)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.15)",
      }}
      className="flex flex-col overflow-hidden"
      onPointerDown={() => focusWindow(win.id)}
    >
      {/* ── Title Bar ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 shrink-0 select-none"
        style={{
          height: 40,
          background: "linear-gradient(180deg, #2d2f3d 0%, #1e1f2b 100%)",
          cursor: win.maximized ? "default" : "grab",
          userSelect: "none",
        }}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
      >
        <div className="flex items-center gap-1.5 shrink-0 mr-1">
          <TLBtn color="bg-red-500 hover:bg-red-600 shadow-sm" title="Fechar (×)"
            onClick={() => closeWindow(win.id)}>
            <svg className="w-2.5 h-2.5 text-red-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={1.8}>
              <path d="M2 2l6 6M8 2l-6 6"/>
            </svg>
          </TLBtn>
          <TLBtn color="bg-yellow-400 hover:bg-yellow-500 shadow-sm" title="Minimizar (−)"
            onClick={() => minimizeWindow(win.id)}>
            <svg className="w-2.5 h-2.5 text-yellow-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2}>
              <path d="M1 5h8"/>
            </svg>
          </TLBtn>
          <TLBtn
            color="bg-green-500 hover:bg-green-600 shadow-sm"
            title={win.maximized ? "Restaurar" : "Maximizar"}
            onClick={() => win.maximized ? restoreWindow(win.id) : maximizeWindow(win.id)}
          >
            {win.maximized
              ? <svg className="w-2.5 h-2.5 text-green-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={1.8}><path d="M3 1H1v2M7 1h2v2M1 7v2h2M9 7v2H7"/><path d="M3 3h4v4H3z"/></svg>
              : <svg className="w-2.5 h-2.5 text-green-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={1.8}><path d="M1 3V1h2M7 1h2v2M9 7v2H7M3 9H1V7"/></svg>
            }
          </TLBtn>
        </div>
        {win.icon && <span className="text-sm shrink-0 leading-none">{win.icon}</span>}
        <span className="flex-1 text-[12px] font-semibold truncate text-white/90 pointer-events-none">
          {win.title}
        </span>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-white">
        {win.content}
      </div>

      {/* ── Resize handles (8 zones — hidden unless hovered) ─────────────── */}
      {!win.maximized && HANDLES.map(({ h, style: hs }) => (
        <div
          key={h}
          style={{ position: "absolute", ...hs }}
          onPointerDown={e => onResizePointerDown(e, h)}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
        />
      ))}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// ── WindowLayer ───────────────────────────────────────────────────────────────

interface WindowLayerProps {
  windows: WindowDef[];
  sidebarWidth?: number;
}

export function WindowLayer({ windows }: WindowLayerProps) {
  return (
    <>
      {windows
        .filter(w => !w.minimized)
        .map(w => <FloatingWindow key={w.id} win={w} />)}
    </>
  );
}
