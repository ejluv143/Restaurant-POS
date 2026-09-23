import Header from "@/components/Header";

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 print:h-auto">
      <Header />
      {children}
    </div>
  );
}
