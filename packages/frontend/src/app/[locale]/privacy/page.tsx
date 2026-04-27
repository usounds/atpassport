import React from 'react';
import { Container, Title, Text, Stack, Paper } from '@mantine/core';
import { getMarkdownContent } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, routing } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { data, content } = await getMarkdownContent('privacy', locale);

  return (
    <Container size="sm" py={{ base: 'md', sm: 'xl' }}>
      <Stack gap="xl">
        <Paper 
          p={{ base: 'md', sm: 'xl' }} 
          radius="md" 
          shadow="sm"
          className="responsive-content-paper"
        >
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
                  p: ({ children }) => <Text size="sm" mb="sm" style={{ whiteSpace: 'pre-wrap' }}>{children}</Text>,
                  ul: ({ children }) => <Stack gap={4} mb="md" pl="md" style={{ listStyleType: 'disc' }}>{children}</Stack>,
                  li: ({ children }) => (
                    <div style={{ display: 'list-item', fontSize: 'var(--mantine-font-size-sm)' }}>
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
