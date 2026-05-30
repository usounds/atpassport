import React from 'react';
import { Container, Stack, Text, Title, Paper } from '@mantine/core';
import { setRequestLocale } from 'next-intl/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from '@/i18n/routing';
import { createPageMetadata } from '@/lib/seo';
import { contentLocales } from '@/lib/seo';
import { getMarkdownContent } from '@/lib/markdown';

export function generateStaticParams() {
  return contentLocales.map((locale) => ({ locale }));
}

const descriptions: Record<string, string> = {
  en: 'Implementation guide for adding @passport handle selection, callback handling, domain verification, and extension support to an atproto app.',
  ja: 'atprotoアプリに@passportのハンドル選択、callback処理、ドメイン確認、拡張機能対応を追加するための実装ガイドです。',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { data } = await getMarkdownContent('developers-guide', locale);

  return createPageMetadata({
    locale,
    path: '/developers/guide',
    title: data.title,
    description: descriptions[locale] ?? descriptions.en,
    index: contentLocales.includes(locale as (typeof contentLocales)[number]),
    alternateLocales: contentLocales,
  });
}

export default async function DeveloperGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { data, content } = await getMarkdownContent('developers-guide', locale);

  return (
    <Container size="sm" py={{ base: 'md', sm: 'xl' }}>
      <Stack gap="xl">
        <Paper p={{ base: 'md', sm: 'xl' }} radius="md" shadow="sm" className="responsive-content-paper">
          <Stack gap="lg">
            <div>
              <Title order={2}>{data.title}</Title>
              <Text size="sm" c="dimmed" mt="xs">
                {locale === 'ja' ? `最終更新日: ${data.last_updated}` : `Last updated: ${data.last_updated}`}
              </Text>
            </div>

            <div style={{ lineHeight: 1.6 }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => <Title order={4} mb="xs" mt="lg">{children}</Title>,
                  h3: ({ children }) => <Title order={5} mb="xs" mt="md">{children}</Title>,
                  p: ({ children }) => <Text size="sm" mb="sm" style={{ whiteSpace: 'pre-wrap' }}>{children}</Text>,
                  ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 16 }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 16 }}>{children}</ol>,
                  li: ({ children }) => (
                    <li style={{ fontSize: 'var(--mantine-font-size-sm)', marginBottom: 4 }}>
                      {children}
                    </li>
                  ),
                  code: ({ className, children }) => {
                    const isBlock = className?.includes('language-') || (typeof children === 'string' && children.includes('\n'));

                    if (isBlock) {
                      return (
                        <pre style={{
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'break-word',
                          backgroundColor: 'light-dark(rgba(0, 0, 0, 0.03), rgba(255, 255, 255, 0.05))',
                          padding: 12,
                          borderRadius: 8,
                          fontSize: 'var(--mantine-font-size-sm)',
                          border: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
                          marginBottom: 16,
                          marginTop: 8,
                        }}>{children}</pre>
                      );
                    }

                    return (
                      <code style={{
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        backgroundColor: 'light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.1))',
                        padding: '2px 4px',
                        borderRadius: 4,
                        fontSize: '0.9em',
                      }}>{children}</code>
                    );
                  },
                  pre: ({ children }) => <>{children}</>,
                  blockquote: ({ children }) => (
                    <div style={{
                      borderLeft: '3px solid var(--mantine-color-blue-5)',
                      paddingLeft: 12,
                      marginBottom: 16,
                      color: 'var(--mantine-color-dimmed)',
                    }}>
                      {children}
                    </div>
                  ),
                  a: ({ href, children }) => {
                    const isInternal = !!href && (
                      href.startsWith('/') ||
                      href === 'https://atpassport.net' ||
                      href.startsWith('https://atpassport.net/') ||
                      href === 'https://dev.atpassport.net' ||
                      href.startsWith('https://dev.atpassport.net/')
                    );
                    const finalHref = href?.replace(/^https:\/\/(dev\.)?atpassport\.net(\/[a-z]{2})?/, '') || '';

                    if (isInternal && href) {
                      return <Link href={finalHref as "/"} style={{ color: 'var(--mantine-color-blue-6)' }}>{children}</Link>;
                    }
                    return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-blue-6)' }}>{children}</a>;
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
