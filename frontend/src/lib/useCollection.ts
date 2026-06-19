"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { isFirebaseConfigured, db } from "./firebase";
import {
  collection, doc, onSnapshot, writeBatch,
} from "firebase/firestore";

/**
 * Drop-in replacement for the useState+localStorage pattern used across all modules.
 * When Firebase is configured → syncs to Firestore in real-time.
 * Without Firebase → falls back to localStorage only.
 *
 * Usage:
 *   const { items: facturas, setItems: setFacturas } =
 *     useCollection<Factura>("educontas-vendas-2026", SEED);
 */
export function useCollection<T extends { id: string }>(
  key: string,
  seed: T[] = [],
) {
  const [items, setItemsState] = useState<T[]>(seed);
  const [loading, setLoading]  = useState(true);
  const itemsRef               = useRef<T[]>(seed);

  // Keep ref in sync so setItems closure always sees the latest array
  useEffect(() => { itemsRef.current = items; }, [items]);

  // ── 1. Load from localStorage immediately (instant, works offline) ──────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as T[];
        setItemsState(parsed);
        itemsRef.current = parsed;
      }
    } catch {}
    if (!isFirebaseConfigured) setLoading(false);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Subscribe to Firestore for real-time cloud sync ──────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !db) { setLoading(false); return; }

    const col  = collection(db, key);
    const unsub = onSnapshot(
      col,
      (snap) => {
        const data = snap.docs.map((d) => ({ ...d.data(), id: d.id } as T));
        // Use Firestore data if it has content OR if server confirmed empty collection
        if (data.length > 0 || !snap.metadata.fromCache) {
          setItemsState(data);
          itemsRef.current = data;
          localStorage.setItem(key, JSON.stringify(data));
        }
        setLoading(false);
      },
      () => setLoading(false), // on error: keep localStorage data
    );

    return unsub;
  }, [key]);

  // ── 3. Write: updates state + localStorage + Firestore (fire-and-forget) ────
  // Accepts both a plain array T[] AND a functional update (prev: T[]) => T[]
  // (mirrors the React useState setter API so existing hooks need no changes)
  const setItems = useCallback(
    (nextOrFn: T[] | ((prev: T[]) => T[])) => {
      const prev = itemsRef.current;
      const next = typeof nextOrFn === "function" ? nextOrFn(prev) : nextOrFn;
      setItemsState(next);
      itemsRef.current = next;
      localStorage.setItem(key, JSON.stringify(next));

      if (!isFirebaseConfigured || !db) return;

      const firestoreDb = db;
      const batch       = writeBatch(firestoreDb);
      const nextIds     = new Set(next.map((i) => i.id));

      // Delete items removed from array
      prev.forEach((item) => {
        if (!nextIds.has(item.id)) {
          batch.delete(doc(firestoreDb, key, item.id));
        }
      });

      // Upsert all current items
      next.forEach((item) => {
        batch.set(doc(firestoreDb, key, item.id), item as Record<string, unknown>);
      });

      batch.commit().catch(console.error);
    },
    [key],
  );

  return { items, setItems, loading };
}
