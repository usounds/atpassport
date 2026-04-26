import { Container } from '@mantine/core';
import { CallbackHandler } from './CallbackHandler';
import { AtPassport } from '@atpassport/client/core';
import { headers } from 'next/headers';

export default async function CallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ handle?: string; [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const sParams = await searchParams;
  const headerList = await headers();

  const host = headerList.get('host') || 'localhost:3000';
  const protocol = headerList.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const baseUrl = `${protocol}://${host}`;
  const callbackUrl = `${baseUrl}/${locale}/developers/verify/callback`;

  // AtPassport からの戻り（handle パラメータあり）をサーバーサイドで解析
  let parsedHandle: string | null = null;
  if (sParams.handle) {
    const atp = new AtPassport({
      callbackUrl,
      baseUrl,
      lang: locale as 'en' | 'ja' | 'pt' | 'de' | 'fr' | 'es',
    });
    const url = new URL(callbackUrl);
    Object.entries(sParams).forEach(([k, v]) => {
      if (typeof v === 'string') url.searchParams.set(k, v);
    });
    try {
      const parsed = atp.parseCallback(url.toString());
      parsedHandle = (parsed as { handle?: string | null }).handle || null;
    } catch (e) {
      console.error('parseCallback failed:', e);
    }
  }

  return (
    <Container size="sm" py="xl">
      <CallbackHandler
        locale={locale}
        parsedHandle={parsedHandle}
      />
    </Container>
  );
}
