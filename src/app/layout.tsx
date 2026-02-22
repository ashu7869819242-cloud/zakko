import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Campus Canteen - Smart Ordering System",
  description: "Order food from your college canteen with AI-powered assistance. Browse menu, manage wallet, and track orders in real-time.",
  keywords: "college canteen, food ordering, campus, AI chatbot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main>{children}</main>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: "12px",
                  background: "#1e3a5f",
                  color: "#fff",
                  fontSize: "14px",
                },
              }}
            />
          </CartProvider>
        </AuthProvider>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
