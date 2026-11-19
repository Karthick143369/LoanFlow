import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "LoanFlow | Lending workspace",
  description:
    "From application to approval. A full-stack React lending workflow demo.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
