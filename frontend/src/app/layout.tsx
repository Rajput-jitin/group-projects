import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchemeSeva AI – Find Government Schemes You Are Eligible For",
  description:
    "Discover government benefits, scholarships, subsidies and welfare schemes tailored to your profile using AI. India's most intelligent scheme discovery platform.",
  keywords:
    "government schemes India, scholarship, subsidy, eligibility, AI, MyScheme, PM Kisan, Ayushman Bharat",
  openGraph: {
    title: "SchemeSeva AI – AI-Powered Government Scheme Discovery",
    description:
      "Find every government scheme you're eligible for in under 5 seconds using AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
