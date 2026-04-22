'use client';

import { Table, ActionIcon, Group, Text, Menu, Stack, Center } from '@mantine/core';
import { IconDotsVertical, IconTrash, IconWorld, IconShieldCheck, IconFileCheck, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { CustomBadge } from '@/components/CustomBadge';
import { NetAtpassportVerifyList } from '@/lexicons/index';

interface DomainListProps {
  domains: NetAtpassportVerifyList.Domain[];
  onWithdraw: (domain: string) => void;
  onUpdatePublic: (domain: string, isPublic: boolean) => void;
  loading?: boolean;
}

export function DomainList({ domains, onWithdraw, onUpdatePublic, loading }: DomainListProps) {
  const t = useTranslations('Developers');

  if (domains.length === 0) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <Text c="dimmed" size="sm">{t('empty_domains')}</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Table verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t('domain_input_label')}</Table.Th>
          <Table.Th>{t('method_label')}</Table.Th>
          <Table.Th>{t('last_verified')}</Table.Th>
          <Table.Th style={{ width: 100 }}></Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {domains.map((d) => (
          <Table.Tr key={d.domain}>
            <Table.Td>
              <Group gap="xs">
                <IconWorld size={16} color="var(--mantine-color-blue-filled)" />
                <Text size="sm" fw={600}>{d.domain}</Text>
                {d.isPublic ? (
                  <CustomBadge variant="dot" color="green">{t('public')}</CustomBadge>
                ) : (
                   <CustomBadge variant="dot" color="gray">{t('private')}</CustomBadge>
                )}
              </Group>
            </Table.Td>
            <Table.Td>
              <Group gap={4}>
                {d.method === 'file' ? (
                  <IconFileCheck size={14} color="var(--mantine-color-orange-6)" />
                ) : (
                  <IconShieldCheck size={14} color="var(--mantine-color-blue-6)" />
                )}
                <Text size="xs" c="dimmed">
                  {d.method === 'file' ? t('method_file') : t('method_oauth')}
                </Text>
              </Group>
            </Table.Td>
            <Table.Td>
              <Text size="xs" c="dimmed" suppressHydrationWarning>
                {new Date(d.verifiedAt).toLocaleDateString()}
              </Text>
            </Table.Td>
            <Table.Td>
              <Group justify="flex-end">
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>{t('settings')}</Menu.Label>
                    <Menu.Item
                      leftSection={d.isPublic ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                      onClick={() => onUpdatePublic(d.domain, !d.isPublic)}
                      disabled={loading}
                    >
                      {d.isPublic ? t('make_private') : t('make_public')}
                    </Menu.Item>
                    
                    <Menu.Divider />
                    
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => onWithdraw(d.domain)}
                      disabled={loading}
                    >
                      {t('cancel_verification')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
