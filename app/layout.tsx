import "./globals.css";
import { cn } from "@/lib/utils";
import { Inter, Noto_Sans_SC, JetBrains_Mono } from "next/font/google";
import ChatSidebar from "@/components/chat-sidebar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-en-sans",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-zh-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          inter.variable,
          notoSansSC.variable,
          jetBrainsMono.variable,
          "antialiased"
        )}
      >
        <div className="flex h-screen">
          <ChatSidebar />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
