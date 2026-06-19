"use client";

import { useWindowManager } from "@/lib/windowManager";
import QuickNovaConta from "./QuickNovaConta";
import QuickNovoFornecedor from "./QuickNovoFornecedor";
import QuickNovoCliente from "./QuickNovoCliente";

/**
 * Hook that provides convenient open functions for quick-action floating windows.
 * Use inside any module page component.
 */
export function useQuickActions() {
  const { openWindow, closeWindow } = useWindowManager();

  function openNovaConta(onSaved?: (code: string, name: string) => void) {
    const id = "quick-nova-conta";
    openWindow({
      id,
      title: "Nova Conta — PGCA",
      icon: "📒",
      content: (
        <QuickNovaConta
          onSaved={onSaved}
          onClose={() => closeWindow(id)}
        />
      ),
      x: 80, y: 80, width: 380, height: 440,
      minimized: false, maximized: false,
    });
  }

  function openNovoFornecedor(onSaved?: (f: { id: string; nome: string }) => void) {
    const id = "quick-novo-fornecedor";
    openWindow({
      id,
      title: "Novo Fornecedor",
      icon: "🏭",
      content: (
        <QuickNovoFornecedor
          onSaved={onSaved}
          onClose={() => closeWindow(id)}
        />
      ),
      x: 100, y: 60, width: 420, height: 520,
      minimized: false, maximized: false,
    });
  }

  function openNovoCliente(onSaved?: (c: { id: string; nome: string }) => void) {
    const id = "quick-novo-cliente";
    openWindow({
      id,
      title: "Novo Cliente",
      icon: "👤",
      content: (
        <QuickNovoCliente
          onSaved={onSaved}
          onClose={() => closeWindow(id)}
        />
      ),
      x: 100, y: 60, width: 420, height: 560,
      minimized: false, maximized: false,
    });
  }

  return { openNovaConta, openNovoFornecedor, openNovoCliente };
}
