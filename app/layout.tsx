import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoneyLite 小账本",
  description: "红黑白极简风个人记账 App"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
