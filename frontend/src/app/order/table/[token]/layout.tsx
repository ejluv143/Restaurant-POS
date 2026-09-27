import { inter } from "@/lib/fonts";

export default function TableOrderLayout({ children }: LayoutProps<"/order/table/[token]">) {
  return <div className={`theme-resto ${inter.variable} min-h-screen`}>{children}</div>;
}
