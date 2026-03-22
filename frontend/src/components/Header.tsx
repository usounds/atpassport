'use client';

import { Container, Group, Title, Burger, Drawer, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import classes from './Header.module.css';

import Image from 'next/image';

const links = [
  { link: '/about', labelKey: 'about' },
  { link: '/terms', labelKey: 'terms' },
  { link: '/privacy', labelKey: 'privacy' },
];

export function Header() {
  const t = useTranslations('Home');
  const tNav = useTranslations('Nav');
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure(false);

  const items = links.map((link) => {
    const isActive = pathname === link.link;
    return (
      <Link
        key={link.labelKey}
        href={link.link}
        className={classes.link}
        onClick={close}
      >
        {tNav(link.labelKey)}
      </Link>
    );
  });

  return (
    <header className={classes.header}>
      <Container size="sm" className={classes.inner}>
        <Link href="/" className={classes.logo}>
          <Image src="/icon128.svg" alt="logo" width={24} height={24} />
          <Title order={3} m={0} style={{ lineHeight: 1 }}>{t('title')}</Title>
        </Link>


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

        {opened && (
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
        )}
      </Container>
    </header>
  );
}
