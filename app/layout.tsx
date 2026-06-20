import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "热点信号台 | Hao Hot Monitor",
  description: "面向内容创作者的实时热点雷达，聚合多平台信号并提供 AI 研判。",
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