"use client";

import { useEffect, useState, ReactNode } from "react"; // useState used for sidebarWidth in taskbar
import { WindowManagerProvider, useWindowManager } from "@/lib/windowManager";
import { WindowLayer } from "@/components/FloatingWindow";
import { WindowTaskbar } from "@/components/WindowTaskbar";

// Inner component so it can access the WM context
function WindowRenderer() {
  const { windows } = useWindowManager();
  const [sidebarWidth, setSidebarWidth] = useState(268);

  useEffect(() => {
    function update() {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--sidebar-width").trim();
      setSidebarWidth(parseInt(raw, 10) || 268);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <>
      {/* WindowLayer reads sidebar width from CSS var directly */}
      <WindowLayer windows={windows} />
      <WindowTaskbar sidebarWidth={sidebarWidth} />
    </>
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <WindowManagerProvider>
      {children}
      <WindowRenderer />
    </WindowManagerProvider>
  );
}
