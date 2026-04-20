import React from 'react';
import { Container, Title, Text, Stack, Paper, Divider, Table, Alert } from '@mantine/core';
import { getMarkdownContent } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from '@/i18n/routing';
import { IconInfoCircle } from '@tabler/icons-react';
import Script from 'next/script';
import { BlueskyEmbedManager } from '@/components/BlueskyEmbedManager';

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
    <Container size="sm" py={{ base: 'md', sm: 'xl' }}>
      <Stack gap="xl">
        <Paper 
          p={{ base: 'md', sm: 'xl' }} 
          radius="md" 
          shadow="sm"
          className="responsive-content-paper"
        >
          <BlueskyEmbedManager />
          <Script src="https://embed.bsky.app/static/embed.js" strategy="lazyOnload" />
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
                  code: ({ className, children }) => {
                    if (className === 'language-bluesky-embed' && typeof children === 'string') {
                      return (
                        <div 
                          dangerouslySetInnerHTML={{ __html: children }} 
                          style={{ marginBottom: '16px' }}
                        />
                      );
                    }

                    const isBlock = className?.includes('language-') || (typeof children === 'string' && children.includes('\n'));
                    
                    if (isBlock) {
                      return (
                        <pre style={{ 
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'break-word', 
                          backgroundColor: 'light-dark(rgba(0, 0, 0, 0.03), rgba(255, 255, 255, 0.05))',
                          padding: '12px',
                          borderRadius: '8px',
                          fontSize: 'var(--mantine-font-size-sm)',
                          border: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
                          marginBottom: '16px',
                          marginTop: '8px'
                        }}>{children}</pre>
                      );
                    }
                    
                    return (
                      <code style={{ 
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word', 
                        backgroundColor: 'light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.1))',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        fontSize: '0.9em'
                      }}>{children}</code>
                    );
                  },
                  pre: ({ children }) => <>{children}</>,
                  h2: ({ children }) => <Title order={4} mb="xs" mt="lg">{children}</Title>,
                  h3: ({ children }) => <Title order={5} mb="xs" mt="md">{children}</Title>,
                  p: ({ children }) => (
                    <Text 
                      size="sm" 
                      style={{ 
                        marginBottom: 'var(--markdown-p-margin, var(--mantine-spacing-sm))',
                        overflowWrap: 'break-word' 
                      }}
                    >
                      {children}
                    </Text>
                  ),
                  ul: ({ children }) => <ul style={{ paddingLeft: '20px', marginBottom: '16px', listStyleType: 'disc' }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ paddingLeft: '20px', marginBottom: '16px', listStyleType: 'decimal' }}>{children}</ol>,
                  li: ({ children }) => (
                    <li style={{ 
                      fontSize: 'var(--mantine-font-size-sm)', 
                      overflowWrap: 'break-word',
                      marginBottom: '4px'
                    }}>
                      {children}
                    </li>
                  ),
                  hr: () => <Divider my="xl" />,
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
                  blockquote: ({ children }) => (
                    <div style={{ '--markdown-p-margin': '0px' } as React.CSSProperties}>
                      <Alert 
                        icon={<IconInfoCircle size={18} />} 
                        color="blue" 
                        radius="md" 
                        mb="md"
                        py="xs"
                        styles={{
                          message: { 
                            fontSize: 'var(--mantine-font-size-sm)', 
                            lineHeight: 1.6,
                          },
                        }}
                      >
                        {children}
                      </Alert>
                    </div>
                  ),
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
