'use client';

import { Container, Group, Title, Burger, Drawer, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { TicketsPlane } from 'lucide-react';
import classes from './Header.module.css';

const links = [
  { link: '/terms', labelKey: 'terms' },
  { link: '/privacy', labelKey: 'privacy' },
];

export function Header() {
  const t = useTranslations('Home');
  const tNav = useTranslations('Nav');
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure(false);

  const items = links.map((link) => {
    // Check if current path ends with the link path (to handle locale prefix)
    const isActive = pathname.endsWith(link.link);
    return (
      <a
        key={link.labelKey}
        href={link.link}
        className={classes.link}
        onClick={close}
      >
        {tNav(link.labelKey)}
      </a>
    );
  });

  return (
    <header className={classes.header}>
      <Container size="sm" className={classes.inner}>
        <a href="/" className={classes.logo}>
          <img src="/icon128.svg" alt="logo" style={{ width: '32px', height: '32px' }} />
          <Title order={3}>{t('title')}</Title>
        </a>

        <Group gap={5} visibleFrom="xs">
          {items}
        </Group>

        <Burger
          opened={opened}
          onClick={toggle}
          hiddenFrom="xs"
          size="sm"
          aria-label="Toggle navigation"
        />

        <Drawer
          opened={opened}
          onClose={close}
          size="70%"
          padding="md"
          title={t('title')}
          hiddenFrom="xs"
          zIndex={1000}
        >
          <Stack gap={0}>
            {items}
          </Stack>
        </Drawer>
      </Container>
    </header>
  );
}
