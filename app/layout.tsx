import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "웹툰 자동 생성기 – Hyun's Cartoon Studio",
  description: "장문 스토리를 20컷 웹툰으로 자동 변환하는 AI 웹툰 생성 스튜디오",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
