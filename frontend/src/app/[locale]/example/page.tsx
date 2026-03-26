import { ExampleAppClient } from './ExampleAppClient';
import { AtPassport } from '@atpassport/client/core';
import { headers } from 'next/headers';

export default async function ExamplePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const sParams = await searchParams;
  const headerList = await headers();
  const host = headerList.get('host') || 'localhost:3000';
  const protocol = headerList.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const baseUrl = `${protocol}://${host}`;
  const pathname = `/${locale}/example`;
  const callbackUrl = `${baseUrl}${pathname}`;

  let initialResult = null;
  if (sParams.handle) {
    const atp = new AtPassport({
      callbackUrl,
      baseUrl,
      lang: locale as 'en' | 'ja' | 'pt' | 'de' | 'fr' | 'es',
    });
    
    // Construct the full URL for parseCallback
    const url = new URL(callbackUrl);
    Object.entries(sParams).forEach(([key, value]) => {
      if (typeof value === 'string') {
        url.searchParams.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      }
    });

    try {
      initialResult = atp.parseCallback(url.toString());
    } catch (e) {
      console.error('Server-side parseCallback failed:', e);
    }
  }

  return (
    <ExampleAppClient 
      locale={locale} 
      initialResult={initialResult} 
    />
  );
}
