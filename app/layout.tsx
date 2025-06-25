import "./globals.css";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(inter.variable, "antialiased")}>
        <main>{children}</main>
      </body>
    </html>
  );
}
