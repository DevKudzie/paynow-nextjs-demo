import { useThemeStore } from '@/utils/theme';
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { useRouter } from 'next/router';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isDarkMode } = useThemeStore();
  const router = useRouter();
  
  // Don't wrap payment result pages with the layout
  if (router.pathname.startsWith('/payment/')) {
    return <>{children}</>;
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''} ${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-white dark:bg-dark-900`}>
      <main>{children}</main>
    </div>
  );
}
