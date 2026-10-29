import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Ticketing V3 | 공연 탐색", description: "새로운 공연을 만나보세요" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
