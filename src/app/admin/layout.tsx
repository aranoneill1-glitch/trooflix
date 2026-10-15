import AdminSidebar from "@/components/AdminSidebar";

export const metadata = {
  title: "Trooflix Admin",
  manifest: "/manifest-admin.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TF Admin",
  },
};


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0 pt-14 md:pt-0">{children}</div>
    </div>
  );
}
