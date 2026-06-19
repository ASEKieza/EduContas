"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && isFirebaseConfigured) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // While checking auth state, show a spinner
  if (loading && isFirebaseConfigured) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">A verificar sessão…</p>
        </div>
      </div>
    );
  }

  // If Firebase is configured but no user, render nothing (redirect in progress)
  if (!user && isFirebaseConfigured) return null;

  // Firebase not configured → dev mode, bypass auth
  return <>{children}</>;
}
