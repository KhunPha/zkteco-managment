import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Enterprise ZKTeco Biometric Attendance Platform",
  description: "Direct TCP/IP & ADMS Push Biometric Attendance Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

