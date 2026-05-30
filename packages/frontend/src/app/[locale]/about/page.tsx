import React from 'react';
import { Container, Title, Text, Stack, Paper, Divider, Table, Alert } from '@mantine/core';
import { getMarkdownContent } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, routing } from '@/i18n/routing';
import { IconInfoCircle } from '@tabler/icons-react';
import Script from 'next/script';
import { BlueskyEmbedManager } from '@/components/BlueskyEmbedManager';
import { setRequestLocale } from 'next-intl/server';
import { contentLocales, createPageMetadata } from '@/lib/seo';

const descriptions: Record<string, string> = {
  en: '@passport removes repeated atproto handle entry by letting users register handles once and reuse them across supported apps and browser extensions.',
  ja: '@passport は、atproto サービスで毎回ハンドルを入力する手間を減らすための、ハンドル管理・認証アシスタントです。',
};

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { data } = await getMarkdownContent('about', locale);
  const hasLocalizedContent = contentLocales.includes(locale as (typeof contentLocales)[number]);

  return createPageMetadata({
    locale,
    path: '/about',
    title: data.title,
    description: descriptions[locale] ?? descriptions.en,
    index: hasLocalizedContent,
    alternateLocales: contentLocales,
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": locale === 'ja' ? "無料で利用できますか？" : "Is it free to use?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'ja' ? "はい、@passportは完全に無料で利用できます。広告表示や追加の課金もありません。" : "Yes, @passport is completely free to use. There are no ads or additional charges."
                  }
                },
                {
                  "@type": "Question",
                  "name": locale === 'ja' ? "セキュリティやプライバシーは安全ですか？" : "Is it secure and private?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'ja' ? "はい。@passportは公開情報であるハンドル（例: @alice.bsky.social）のみを保存します。パスワード、秘密鍵、JWTトークンなどの機密情報は一切サーバーに保存されないため、安心してご利用いただけます。" : "Yes. @passport only stores your public handle (e.g., @alice.bsky.social). Sensitive information such as passwords, private keys, or JWT tokens are never stored on our servers."
                  }
                },
                {
                  "@type": "Question",
                  "name": locale === 'ja' ? "登録できるハンドルの数に制限はありますか？" : "Is there a limit to the number of handles I can register?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'ja' ? "1つのセッションにつき最大15件までハンドルを登録することが可能です。" : "You can register up to 15 handles per session."
                  }
                },
                {
                  "@type": "Question",
                  "name": locale === 'ja' ? "長期間利用しないとデータはどうなりますか？" : "What happens to my data if I don't use the service for a long time?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'ja' ? "利用規約に基づき、365日間一度も利用がないハンドル情報は、事前の通知なく削除される場合があります。" : "Based on our Terms of Service, handle information that hasn't been used for 365 days may be deleted without prior notice."
                  }
                },
                {
                  "@type": "Question",
                  "name": locale === 'ja' ? "複数のデバイスで登録内容を同期できますか？" : "Can I sync my registered handles across multiple devices?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'ja' ? "はい。「デバイス間の共有」機能を使用することで、QRコードまたはURLを通じて他のブラウザやデバイスとハンドル一覧を同期できます。" : "Yes. By using the 'Device Sharing' feature, you can sync your handle list with other browsers or devices via QR code or URL."
                  }
                },
                {
                  "@type": "Question",
                  "name": locale === 'ja' ? "開発者ですが、自分のサイトで表示される警告を消すにはどうすればいいですか？" : "I'm a developer. How can I remove the warning displayed for my site?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'ja' ? "開発者ポータルからドメインの所有権を確認（検証）することで、そのドメインに対する警告を表示しないように設定できます。" : "By verifying domain ownership through the Developer Portal, you can remove warnings for that specific domain."
                  }
                },
                {
                  "@type": "Question",
                  "name": locale === 'ja' ? "ブラウザ拡張機能と連携サイトはどのように関係していますか？" : "How do the browser extension and integrated sites work together?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'ja' ? "@passportはエコシステムとして設計されています。あらかじめ本サイトでハンドルを登録しておけば、対応サイトではボタン一つでログインでき、未対応サイトでも拡張機能を通じて同じハンドルリストから1タップで入力が可能です。どちらの方法でも、一度の登録で複数のサイトでの体験がシームレスに繋がります。" : "@passport is designed as an ecosystem. Once you register your handles on this site, you can log in with a single button on supported sites. On unsupported sites, the browser extension allows you to input those same handles with one tap. In both cases, your registration connects your experience seamlessly across multiple sites."
                  }
                },
                {
                  "@type": "Question",
                  "name": locale === 'ja' ? "ハンドルを変更したり、別のPDSに引っ越した場合はどうすればいいですか？" : "What should I do if I change my handle or move to a different PDS?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'ja' ? "ハンドルの文字列そのものが変わった場合や、利用しているPDS（サーバー）を変更した場合は、「メタデータの更新」を行う必要があります。トップページのハンドル一覧から該当するハンドルのメニューを開き、「メタデータを更新」をタップしてください。これにより、新しい情報が@passportに反映され、引き続き正しくログインできるようになります。" : "If your handle string changes or you move to a different PDS (server), you need to perform a 'Metadata Update.' Open the menu next to the handle on the top page and tap 'Update Metadata.' This will reflect the new information in @passport and ensure you can continue to log in correctly."
                  }
                },
                {
                  "@type": "Question",
                  "name": locale === 'ja' ? "登録したデータを削除するにはどうすればいいですか？" : "How can I delete my registered data?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'ja' ? "トップページのハンドル一覧から、削除したいハンドルの横にあるメニュー（3点リーダー）をタップし、「削除」を選択することでいつでも削除可能です。" : "You can delete individual handles at any time by tapping the three-dot menu next to the handle on the top page and selecting 'Delete'."
                  }
                },
                {
                  "@type": "Question",
                  "name": locale === 'ja' ? "atproto以外のSNSでも使えますか？" : "Does it support other social networks?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'ja' ? "atprotoエコシステムをサポートしています。" : "@passport supports the atproto ecosystem."
                  }
                }
              ]
            })
          }}
        />
      </Stack>
    </Container>
  );
}
