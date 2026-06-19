import Sidebar from "@/components/Sidebar";
import { ClientLayout } from "@/components/ClientLayout";
import { AuthGuard } from "@/components/AuthGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
    <ClientLayout>
      <div className="flex h-screen overflow-hidden bg-[#f4f5f7]">
        <Sidebar />
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ marginLeft: "var(--sidebar-width)" }}
        >
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ClientLayout>
    </AuthGuard>
  );
}
