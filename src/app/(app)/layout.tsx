import AuthProvider from "@/components/AuthProvider";
import OnboardingGuard from "@/components/OnboardingGuard";
import Nav from "@/components/Nav";
import DesktopNav from "@/components/DesktopNav";
import ToastProvider from "@/components/Toast";
import ConfirmProvider from "@/components/Confirm";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <OnboardingGuard>
            <div className="app-shell">
              <DesktopNav />
              <main
                className="flex-1 app-main"
                style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
              >
                {children}
              </main>
            </div>
            <Nav />
          </OnboardingGuard>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
