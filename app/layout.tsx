import "./globals.css";
import { cn } from "@/lib/utils";
import { Inter, Noto_Sans_SC } from "next/font/google";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(inter.variable, notoSansSC.variable, "antialiased")}>
        <main>{children}</main>
      </body>
    </html>
  );
}
