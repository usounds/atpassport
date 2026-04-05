import type { Viewport } from 'next';
import { cookies } from 'next/headers';
import { Geist, Geist_Mono } from "next/font/google";
import { Stack } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import NextTopLoader from 'nextjs-toploader';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Header } from '@/components/Header';
import { MantineScript } from '@/components/MantineScript';
import { Footer } from '@/components/Footer';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Home" });

  return {
    title: {
      default: t('title'),
      template: `%s | ${t('title')}`,
    },
    description: t('description'),
    metadataBase: new URL('https://atpassport.net'),
    alternates: {
      canonical: '/',
      languages: {
        'en': '/en',
        'ja': '/ja',
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: 'https://atpassport.net',
      siteName: t('title'),
      images: [
        {
          url: '/atpassportOgp.png',
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/atpassportOgp.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: '/favicon.ico',
      apple: '/icon128.png',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#000000',
};

import { MantineThemeProvider } from '@/providers/MantineThemeProvider';

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const cookieStore = await cookies();
  const colorScheme = (cookieStore.get('mantine-color-scheme')?.value as 'light' | 'dark' | 'auto') || 'light';

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <MantineScript defaultColorScheme={colorScheme} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NextIntlClientProvider messages={messages}>
          <MantineThemeProvider defaultColorScheme={colorScheme}>
            <NextTopLoader color="#58A7F6" showSpinner={false} height={3} />
            <Notifications position="top-right" zIndex={1000} />
            <Stack gap={0} style={{ minHeight: '100vh' }}>
              <Header />
              <main style={{ flex: 1 }}>
                {children}
              </main>
              <Footer />
            </Stack>
          </MantineThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
