import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hao Hot Monitor",
  description: "A live hotspot radar powered by OpenRouter AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}