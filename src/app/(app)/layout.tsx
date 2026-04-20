import AuthProvider from "@/components/AuthProvider";
import OnboardingGuard from "@/components/OnboardingGuard";
import Nav from "@/components/Nav";
import ToastProvider from "@/components/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <OnboardingGuard>
          <main className="flex-1 pb-28">{children}</main>
          <Nav />
        </OnboardingGuard>
      </ToastProvider>
    </AuthProvider>
  );
}
