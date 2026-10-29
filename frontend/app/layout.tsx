import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "MOMENT | Ticketing V3",
  description: "공연을 발견하고 나만의 특별한 순간을 예매하세요.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
