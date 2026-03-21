import { Container, Title, Text, Stack, Paper, Divider } from '@mantine/core';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getMarkdownContent } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    <>
      <Header />
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
                    table: ({ children }) => (
                      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--mantine-font-size-sm)', border: '1px solid var(--mantine-color-default-border)' }}>
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => <thead style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>{children}</thead>,
                    th: ({ children }) => <th style={{ border: '1px solid var(--mantine-color-default-border)', padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>{children}</th>,
                    td: ({ children }) => <td style={{ border: '1px solid var(--mantine-color-default-border)', padding: '12px 8px', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{children}</td>,
                    code: ({ className, children }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const inline = !match;
                      
                      if (inline) {
                        return (
                          <code style={{ 
                            background: 'rgba(0,0,0,0.05)', 
                            padding: '2px 4px', 
                            borderRadius: '4px', 
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere'
                          }}>
                            {children}
                          </code>
                        );
                      }

                      return (
                        <pre style={{ 
                          background: 'rgba(0,0,0,0.05)', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          overflowX: 'auto', 
                          whiteSpace: 'pre-wrap', 
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere'
                        }}>
                          <code className={className}>{children}</code>
                        </pre>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </Stack>
          </Paper>

          <Footer />
        </Stack>
      </Container>
    </>
  );
}
