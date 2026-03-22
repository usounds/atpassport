'use client';

import { Container, Group, Title, Burger, Drawer, Stack, ActionIcon, Menu } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Languages } from 'lucide-react';
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
  const locale = useLocale();
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure(false);

  const handleLocaleChange = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale });
  };

  const languagePicker = (
    <Menu shadow="md" width={140} position="bottom-end" transitionProps={{ transition: 'pop-top-right' }}>
      <Menu.Target>
        <ActionIcon variant="light" color="gray" size="lg" radius="md">
          <Languages size={20} strokeWidth={1.5} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown 
        bg="light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-6))" 
        style={{ border: '1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))' }}
      >
        <Menu.Label c="light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-2))" fw={700}>
          {locale === 'ja' ? '言語を選択' : 'Select Language'}
        </Menu.Label>
        <Menu.Item 
          onClick={() => handleLocaleChange('en')}
          fw={locale === 'en' ? 700 : 400}
          bg={locale === 'en' ? 'light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))' : 'transparent'}
          c="light-dark(var(--mantine-color-black), var(--mantine-color-white))"
        >
          English
        </Menu.Item>
        <Menu.Item 
          onClick={() => handleLocaleChange('ja')}
          fw={locale === 'ja' ? 700 : 400}
          bg={locale === 'ja' ? 'light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))' : 'transparent'}
          c="light-dark(var(--mantine-color-black), var(--mantine-color-white))"
        >
          日本語
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  const items = links.map((link) => {
    const isActive = pathname === link.link;
    return (
      <Link
        key={link.labelKey}
        href={link.link}
        className={`${classes.link} ${isActive ? classes.linkActive : ''}`}
        onClick={close}
        data-active={isActive || undefined}
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

        <Group gap={20} visibleFrom="xs">
          <Group gap={5}>
            {items}
          </Group>
          {languagePicker}
        </Group>

        <Group gap="xs" hiddenFrom="xs">
          {languagePicker}
          <Burger
            opened={opened}
            onClick={toggle}
            size="sm"
            aria-label="Toggle navigation"
          />
        </Group>

        <Drawer
          opened={opened}
          onClose={close}
          size="70%"
          padding="md"
          title={t('title')}
          hiddenFrom="xs"
          zIndex={1000}
          styles={{
            content: { backgroundColor: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-7))' }
          }}
        >
          <Stack gap="md">
            {items}
          </Stack>
        </Drawer>
      </Container>
    </header>
  );
}
