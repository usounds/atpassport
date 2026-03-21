import { Text, Anchor, Group, Divider } from '@mantine/core';

export function Footer() {
  return (
    <footer style={{ marginTop: 'auto', paddingTop: '2rem' }}>
      <Divider mb="sm" />
      <Group justify="center" gap="xs">
        <Text size="xs" c="dimmed">
          Developed by usounds.work
        </Text>
        <Text size="xs" c="dimmed">|</Text>
        <Anchor
          size="xs"
          c="dimmed"
          href="https://github.com/usounds/atpassport"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </Anchor>
      </Group>
    </footer>
  );
}
