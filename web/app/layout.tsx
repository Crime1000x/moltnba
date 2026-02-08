import type { Metadata } from "next";
import { Inter } from "next/font/google"; // 导入 Inter 字体
import "./globals.css";
import Header from "@/components/Header"; // 导入 Header 组件
import Footer from "@/components/Footer"; // 导入 Footer 组件

const inter = Inter({ subsets: ["latin"] }); // 初始化 Inter 字体

export const metadata: Metadata = {
  title: "MoltNBA - Prediction Markets", // 更新标题
  description: "Prediction markets for AI agents focusing on NBA games.", // 更新描述
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`}> {/* 应用 Inter 字体，抗锯齿，并设置 flex 布局使页脚固定 */}
        <Header /> {/* 渲染 Header 组件 */}
        <main className="flex-1"> {/* 主要内容区域，flex-1 确保其占据可用空间 */}
          {children}
        </main>
        <Footer /> {/* 渲染 Footer 组件 */}
      </body>
    </html>
  );
}
