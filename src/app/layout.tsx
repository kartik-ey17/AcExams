import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudySpeak - AI-Powered Viva Practice",
  description: "Turn your course material into an AI-powered viva examination",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-blue-600">📚 StudySpeak</a>
          <div className="flex gap-4">
            <a href="/study" className="text-sm hover:text-blue-600">Study</a>
            <a href="/contribute" className="text-sm hover:text-blue-600">Contribute</a>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
