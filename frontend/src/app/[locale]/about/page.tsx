import React from 'react';
import { Container, Title, Text, Stack, Paper, Divider, Table } from '@mantine/core';
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
                  table: ({ children }) => (
                    <div style={{ overflowX: 'auto' }}>
                      <Table withTableBorder withColumnBorders mb="md" verticalSpacing="xs">
                        {children}
                      </Table>
                    </div>
                  ),
                  thead: ({ children }) => <thead>{children}</thead>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => <tr>{children}</tr>,
                  th: ({ children }) => (
                    <th style={{ 
                      padding: '10px 12px', 
                      borderBottom: '2px solid var(--mantine-color-gray-3)', 
                      textAlign: 'left', 
                      backgroundColor: 'rgba(0, 0, 0, 0.03)', 
                      fontWeight: 600, 
                      fontSize: 'var(--mantine-font-size-sm)' 
                    }}>
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td style={{ 
                      padding: '10px 12px', 
                      borderBottom: '1px solid var(--mantine-color-gray-2)', 
                      fontSize: 'var(--mantine-font-size-sm)' 
                    }}>
                      {children}
                    </td>
                  ),
                  code: ({ children }) => (
                    <code style={{ 
                      wordBreak: 'break-all', 
                      overflowWrap: 'anywhere', 
                      whiteSpace: 'pre-wrap',
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontSize: '0.9em'
                    }}>
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre style={{ 
                      wordBreak: 'break-all', 
                      overflowWrap: 'anywhere', 
                      whiteSpace: 'pre-wrap',
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: 'var(--mantine-font-size-sm)',
                      border: '1px solid var(--mantine-color-gray-3)',
                      marginBottom: '16px'
                    }}>
                      {children}
                    </pre>
                  ),
                  h2: ({ children }) => <Title order={4} mb="xs" mt="lg">{children}</Title>,
                  h3: ({ children }) => <Title order={5} mb="xs" mt="md">{children}</Title>,
                  p: ({ children }) => (
                    <Text size="sm" mb="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                      {children}
                    </Text>
                  ),
                  ul: ({ children }) => <ul style={{ paddingLeft: '20px', marginBottom: '16px', listStyleType: 'disc' }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ paddingLeft: '20px', marginBottom: '16px', listStyleType: 'decimal' }}>{children}</ol>,
                  li: ({ children }) => (
                    <li style={{ 
                      fontSize: 'var(--mantine-font-size-sm)', 
                      wordBreak: 'break-all', 
                      overflowWrap: 'anywhere',
                      marginBottom: '4px'
                    }}>
                      {children}
                    </li>
                  ),
                  hr: () => <Divider my="xl" />,
                  a: ({ href, children }) => {
                    const isInternal = href?.startsWith('/') || href?.startsWith('https://atpassport.net') || href?.startsWith('https://dev.atpassport.net');
                    const finalHref = href?.replace(/https:\/\/(dev\.)?atpassport\.net(\/[a-z]{2})?/, '') || '';
                    
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
