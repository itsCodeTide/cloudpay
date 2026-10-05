import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CloudPay API Docs",
  description: "Interactive API documentation for CloudPay",
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
