'use client';

import { SimpleGrid, Card, Stack, Group, Box, Title, Divider, Avatar, Anchor, Paper, Text } from '@mantine/core';
import { IconShieldCheck as TablerShieldCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useProfileStore } from '@/lib/profile-store';
import type { AppBskyActorDefs } from '@atcute/bluesky';
import type { VerifiedDomain } from '@/lib/security';

interface DirectoryClientProps {
  initialDomains: VerifiedDomain[];
  translations: {
    no_domains: string;
  };
}

export default function DirectoryClient({ initialDomains, translations }: DirectoryClientProps) {
  const profiles = useProfileStore(state => state.profiles);
  const fetchProfiles = useProfileStore(state => state.fetchProfiles);

  useEffect(() => {
    const dids = initialDomains.map(d => d.verifiedByDid);
    if (dids.length === 0) return;
    fetchProfiles(dids);
  }, [initialDomains, fetchProfiles]);

  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {initialDomains.map((domain, index) => {
          const profile = profiles[domain.verifiedByDid];
          return (
            <Card 
              key={domain.domain} 
              className={`premium-card animate-slide-in stagger-${Math.min((index % 10) + 1, 10)}`}
              padding="md" 
              radius="lg"
              bg="transparent"
              style={{ overflow: 'visible' }}
            >
              <Stack gap="xs">
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Title order={5} style={{ 
                      wordBreak: 'break-all', 
                      fontSize: '1rem',
                      letterSpacing: '0.01em'
                    }}>
                      {domain.domain}
                    </Title>
                  </Box>
                  <TablerShieldCheck 
                    size={20} 
                    color="var(--mantine-color-blue-6)" 
                    style={{ filter: 'drop-shadow(0 0 6px rgba(34, 139, 230, 0.2))' }}
                  />
                </Group>

                <Divider variant="dashed" opacity={0.3} />

                <Group gap="xs" align="center" wrap="nowrap">
                  <Avatar 
                    src={profile?.avatar} 
                    radius="md" 
                    size="sm" 
                    style={{ border: '2px solid var(--mantine-color-white)' }}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Anchor
                      href={`https://bsky.app/profile/${profile?.handle || domain.verifiedByDid}`}
                      target="_blank"
                      size="xs"
                      fw={700}
                      truncate="end"
                      display="block"
                      c="blue.7"
                    >
                      @{profile?.handle || domain.verifiedByDid}
                    </Anchor>
                  </Box>
                </Group>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>

      {initialDomains.length === 0 && (
        <Paper p="xl" withBorder ta="center" radius="lg">
          <Text c="dimmed" size="sm">{translations.no_domains}</Text>
        </Paper>
      )}
    </Stack>
  );
}
