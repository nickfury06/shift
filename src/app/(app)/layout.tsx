import AuthProvider from "@/components/AuthProvider";
import Nav from "@/components/Nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Nav />
    </AuthProvider>
  );
}
