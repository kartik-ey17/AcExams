import type { Metadata } from "next";
import AppChrome from "@/components/AppChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "AcExams - AI-Powered Exam Practice",
  description: "Turn your course material into an AI-powered viva examination",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-950 antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
