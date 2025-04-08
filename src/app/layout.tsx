import { Inter } from "next/font/google";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// --- SEO Metadata --- //
// Can now be potentially uncommented or defined properly for Server Components
// export const metadata: Metadata = { ... };

const siteUrl = "https://www.activeinference.org"; // Define siteUrl or import from config
const title = "Active Inference Tutor";
const description = "Interactive tutorials and explanations of Active Inference concepts.";
// const imageUrl = `${siteUrl}/icons/active-inference-icon.svg`; // Potentially used in metadata

// --- JSON-LD Structured Data --- //
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": title,
  "url": siteUrl,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Removed state and effect for header visibility

  return (
    <html lang="en">
      <head>
        {/* Favicon, Meta Tags, Title, JSON-LD Script etc. */}
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/icons/active-inference-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/active-inference-icon.svg"></link>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* Ensure no extra whitespace or elements directly in head if possible */}
      </head>
      <body className={inter.className}>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
