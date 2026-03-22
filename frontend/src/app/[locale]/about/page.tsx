import React from 'react';
import { Container, Title, Text, Stack, Paper, Divider } from '@mantine/core';
import { getMarkdownContent } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from '@/i18n/routing';

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ja' }];
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { data, content } = await getMarkdownContent('about', locale);

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <Paper withBorder p="xl" radius="md" shadow="sm">
          <Stack gap="lg">
            <div>
              <Title order={2}>{data.title || 'Untitled'}</Title>
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
                  p: ({ children }) => (
                    <Text size="sm" mb="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                      {children}
                    </Text>
                  ),
                  ul: ({ children }) => <Stack gap={4} mb="md" pl="md" style={{ listStyleType: 'disc' }}>{children}</Stack>,
                  li: ({ children }) => (
                    <div style={{ display: 'list-item', fontSize: 'var(--mantine-font-size-sm)', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                      {children}
                    </div>
                  ),
                  hr: () => <Divider my="xl" />,
                  a: ({ href, children }) => {
                    const isInternal = href?.startsWith('/') || href?.startsWith('https://atpassport.net') || href?.startsWith('https://dev.atpassport.net');
                    const finalHref = href?.replace(/https:\/\/(dev\.)?atpassport\.net(\/[a-z]{2})?/, '') || '';
                    
                    if (isInternal && href) {
                      // Link の href には routing で定義された特定のパスが必要ですが、
                      // 動的な URL 置換の結果、型チェックが通らなくなるため、
                      // 型安全な代替手段（例えばテンプレートリテラルの型を利用するなど）も考慮できますが、
                      // ここでは string リテラルの代入可能範囲に寄せてキャストします。
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
