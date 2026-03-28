import { Container, Title, Text, Stack, Paper, Group, Avatar, Box, SimpleGrid, Card, Anchor } from '@mantine/core';
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
          <Text c="dimmed" size="xs" mt="xs">
            {t('description')}
          </Text>
        </header>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {domainsWithProfiles.map((domain) => (
            <Card key={domain.domain} withBorder padding="lg" radius="lg" shadow="sm">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={5} style={{ wordBreak: 'break-all' }}>{domain.domain}</Title>
                  <IconShieldCheck size={20} color="var(--mantine-color-green-6)" />
                </Group>

                <Divider />

                <Group gap="sm">
                  <Avatar src={domain.profile?.avatar} radius="xl" size="sm" />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" c="dimmed" mb={2}>{t('verified_by')}</Text>
                    <Anchor 
                      href={`https://bsky.app/profile/${domain.handle}`} 
                      target="_blank" 
                      size="xs" 
                      fw={600} 
                      truncate="end"
                      display="block"
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

function Divider() {
  return <div style={{ height: '1px', backgroundColor: 'var(--mantine-color-gray-2)' }} />;
}
