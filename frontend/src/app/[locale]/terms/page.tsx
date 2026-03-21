import { Container, Title, Text, Stack, Paper } from '@mantine/core';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getMarkdownContent } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ja' }];
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { data, content } = await getMarkdownContent('terms', locale);

  return (
    <>
      <Header />
      <Container size="sm" py="xl">
        <Stack gap="xl">
          <Paper withBorder p="xl" radius="md" shadow="sm">
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

