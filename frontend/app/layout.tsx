import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import AxiosInterceptor from "@/components/AxiosInterceptor";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "NetInfo",
  description: "Advanced AI Project Management Orchestrator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
    <body className="h-full overflow-hidden flex flex-col font-sans">
      <AxiosInterceptor />
      {children}
    </body>
    </html>
  );
}
