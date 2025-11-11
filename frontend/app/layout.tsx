import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Дизайн аудит",
  description: "UX/UI аудит вашего сайта или изображения",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}


