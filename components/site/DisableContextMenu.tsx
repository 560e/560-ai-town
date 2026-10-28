"use client";

import { useEffect } from "react";

export function DisableContextMenu() {
  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    // Capture also covers scene canvases, overlays and portal-rendered panels.
    document.addEventListener("contextmenu", preventContextMenu, true);
    return () => document.removeEventListener("contextmenu", preventContextMenu, true);
  }, []);

  return null;
}
