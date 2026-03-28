import { Container, Title, Text, Stack, Paper, Group, Avatar, Box, SimpleGrid, Card, Anchor, Divider } from '@mantine/core';
import { getTranslations } from 'next-intl/server';
import { getPublicVerifiedDomains } from '@/lib/security';
import { getProfile } from '@/lib/atproto';
import { IconShieldCheck } from '@tabler/icons-react';

export default async function DirectoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Directory' });
  const domains = await getPublicVerifiedDomains();

  const domainsWithProfiles = await Promise.all(
    domains.map(async (domain) => {
      const profile = await getProfile(domain.verifiedByDid);
      return { ...domain, profile };
    })
  );

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <header>
          <Title order={2}>{t('title')}</Title>
          <Text c="dimmed" size="sm" mt="xs">
            {t('description')}
          </Text>
        </header>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {domainsWithProfiles.map((domain, index) => (
            <Card 
              key={domain.domain} 
              className={`premium-card animate-slide-in stagger-${Math.min((index % 10) + 1, 10)}`}
              padding="xl" 
              radius="lg"
              bg="transparent"
              style={{ overflow: 'visible' }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Title order={5} style={{ 
                      wordBreak: 'break-all', 
                      fontSize: '1.1rem',
                      letterSpacing: '0.01em'
                    }}>
                      {domain.domain}
                    </Title>
                  </Box>
                  <IconShieldCheck 
                    size={24} 
                    color="var(--mantine-color-blue-6)" 
                    style={{ filter: 'drop-shadow(0 0 8px rgba(34, 139, 230, 0.3))' }}
                  />
                </Group>

                <Divider variant="dashed" />

                <Group gap="sm" align="center">
                  <Avatar 
                    src={domain.profile?.avatar} 
                    radius="md" 
                    size="md" 
                    style={{ border: '2px solid var(--mantine-color-white)' }}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" c="dimmed" fw={500}>{t('verified_by')}</Text>
                    <Anchor
                      href={`https://bsky.app/profile/${domain.handle}`}
                      target="_blank"
                      size="sm"
                      fw={700}
                      truncate="end"
                      display="block"
                      c="blue.7"
                    >
                      @{domain.handle}
                    </Anchor>
                  </Box>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>

        {domainsWithProfiles.length === 0 && (
          <Paper p="xl" withBorder ta="center" radius="lg">
            <Text c="dimmed" size="sm" >{t('no_domains')}</Text>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
