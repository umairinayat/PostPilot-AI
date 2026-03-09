export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-300 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-300 via-navy-200 to-navy-300" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-electric-500/10 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {children}
      </div>
    </div>
  );
}
