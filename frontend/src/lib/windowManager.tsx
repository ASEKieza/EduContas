"use client";

import React, {
  createContext, useContext, useReducer, useCallback, ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WindowDef {
  id: string;
  title: string;
  icon?: string;
  content: ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

interface WMState {
  windows: WindowDef[];
  topZ: number;
}

type WMAction =
  | { type: "OPEN";            win: Omit<WindowDef, "zIndex"> }
  | { type: "CLOSE";           id: string }
  | { type: "FOCUS";           id: string }
  | { type: "MINIMIZE";        id: string }
  | { type: "MAXIMIZE";        id: string }
  | { type: "RESTORE";         id: string }
  | { type: "MOVE";            id: string; x: number; y: number }
  | { type: "RESIZE";          id: string; width: number; height: number }
  | { type: "MOVE_AND_RESIZE"; id: string; x: number; y: number; width: number; height: number }
  | { type: "CLOSE_ALL" };

// ── Reducer ───────────────────────────────────────────────────────────────────

const BASE_Z = 1000;

function wmReducer(state: WMState, action: WMAction): WMState {
  switch (action.type) {
    case "OPEN": {
      const exists = state.windows.find(w => w.id === action.win.id);
      if (exists) {
        const newZ = state.topZ + 1;
        return {
          ...state, topZ: newZ,
          windows: state.windows.map(w =>
            w.id === action.win.id ? { ...w, minimized: false, zIndex: newZ } : w
          ),
        };
      }
      const newZ = state.topZ + 1;
      return {
        ...state, topZ: newZ,
        windows: [...state.windows, { ...action.win, zIndex: newZ }],
      };
    }

    case "CLOSE":
      return { ...state, windows: state.windows.filter(w => w.id !== action.id) };

    case "CLOSE_ALL":
      return { ...state, windows: [] };

    case "FOCUS": {
      const newZ = state.topZ + 1;
      return {
        ...state, topZ: newZ,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, zIndex: newZ, minimized: false } : w
        ),
      };
    }

    case "MINIMIZE":
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, minimized: true } : w
        ),
      };

    case "MAXIMIZE": {
      const newZ = state.topZ + 1;
      return {
        ...state, topZ: newZ,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, maximized: true, minimized: false, zIndex: newZ } : w
        ),
      };
    }

    case "RESTORE":
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, maximized: false, minimized: false } : w
        ),
      };

    case "MOVE":
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, x: action.x, y: action.y } : w
        ),
      };

    case "RESIZE":
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, width: action.width, height: action.height } : w
        ),
      };

    case "MOVE_AND_RESIZE":
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id
            ? { ...w, x: action.x, y: action.y, width: action.width, height: action.height }
            : w
        ),
      };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface WMContextValue {
  windows: WindowDef[];
  openWindow:         (win: Omit<WindowDef, "zIndex">) => void;
  closeWindow:        (id: string) => void;
  closeAllWindows:    () => void;
  focusWindow:        (id: string) => void;
  minimizeWindow:     (id: string) => void;
  maximizeWindow:     (id: string) => void;
  restoreWindow:      (id: string) => void;
  moveWindow:         (id: string, x: number, y: number) => void;
  resizeWindow:       (id: string, width: number, height: number) => void;
  moveAndResizeWindow:(id: string, x: number, y: number, width: number, height: number) => void;
}

const WMContext = createContext<WMContextValue | null>(null);

export function useWindowManager() {
  const ctx = useContext(WMContext);
  if (!ctx) throw new Error("useWindowManager must be used inside WindowManagerProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wmReducer, { windows: [], topZ: BASE_Z });

  const openWindow         = useCallback((win: Omit<WindowDef, "zIndex">) => dispatch({ type: "OPEN", win }), []);
  const closeWindow        = useCallback((id: string) => dispatch({ type: "CLOSE", id }), []);
  const closeAllWindows    = useCallback(() => dispatch({ type: "CLOSE_ALL" }), []);
  const focusWindow        = useCallback((id: string) => dispatch({ type: "FOCUS", id }), []);
  const minimizeWindow     = useCallback((id: string) => dispatch({ type: "MINIMIZE", id }), []);
  const maximizeWindow     = useCallback((id: string) => dispatch({ type: "MAXIMIZE", id }), []);
  const restoreWindow      = useCallback((id: string) => dispatch({ type: "RESTORE", id }), []);
  const moveWindow         = useCallback((id: string, x: number, y: number) => dispatch({ type: "MOVE", id, x, y }), []);
  const resizeWindow       = useCallback((id: string, w: number, h: number) => dispatch({ type: "RESIZE", id, width: w, height: h }), []);
  const moveAndResizeWindow= useCallback((id: string, x: number, y: number, w: number, h: number) =>
    dispatch({ type: "MOVE_AND_RESIZE", id, x, y, width: w, height: h }), []);

  return (
    <WMContext.Provider value={{
      windows: state.windows,
      openWindow, closeWindow, closeAllWindows,
      focusWindow, minimizeWindow, maximizeWindow, restoreWindow,
      moveWindow, resizeWindow, moveAndResizeWindow,
    }}>
      {children}
    </WMContext.Provider>
  );
}
