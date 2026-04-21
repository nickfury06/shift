import AuthProvider from "@/components/AuthProvider";
import OnboardingGuard from "@/components/OnboardingGuard";
import Nav from "@/components/Nav";
import ToastProvider from "@/components/Toast";
import AdminModeProvider from "@/components/AdminMode";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AdminModeProvider>
          <OnboardingGuard>
            <main className="flex-1 pb-28">{children}</main>
            <Nav />
          </OnboardingGuard>
        </AdminModeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
