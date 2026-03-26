'use client';

import { type AssociationWithProfile } from '@/lib/models';
import { Stack, Card, Group, Avatar, Text, Box } from '@mantine/core';

export function PickerList({ items }: { items: AssociationWithProfile[] }) {
  const handleSelect = (handle: string) => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'atpassport:pick', handle },
        '*'
      );
      window.close();
    }
  };

  return (
    <Stack gap="xs">
      {items.map((item) => (
        <Card
          key={item.did}
          padding="sm"
          radius="md"
          withBorder
          className="picker-item-hoverable picker-item-scale"
          onClick={() => handleSelect(item.handle)}
          style={{ cursor: 'pointer' }}
        >
          <Group wrap="nowrap" gap="md">
            <Avatar src={item.profile?.avatar} radius="xl" size="md" />
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text fw={500} size="sm" truncate="end">
                {item.profile?.displayName || item.handle}
              </Text>
              <Text size="xs" c="dimmed" truncate="end">
                @{item.handle}
              </Text>
            </Box>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
