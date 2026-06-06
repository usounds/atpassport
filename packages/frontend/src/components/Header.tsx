'use client';

import { useState, useEffect } from 'react';
import { Container, Group, Title, Burger, Drawer, Stack, ActionIcon, Menu, useMantineColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Languages, Sun, Moon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import classes from './Header.module.css';

const links = [
  { link: '/about', labelKey: 'about', contentOnly: true },
  { link: '/directory', labelKey: 'directory' },
  { link: '/terms', labelKey: 'terms', contentOnly: true },
  { link: '/privacy', labelKey: 'privacy', contentOnly: true },
];

const contentLocales = ['en', 'ja'];
const contentOnlyPaths = ['/about', '/terms', '/privacy', '/developers/guide'];

function isContentLocale(locale: string) {
  return contentLocales.includes(locale);
}

export function Header() {
  const t = useTranslations('Home');
  const tNav = useTranslations('Nav');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure(false);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  const handleLocaleChange = (nextLocale: string) => {
    const params = searchParams.toString();
    const targetPathname =
      contentOnlyPaths.includes(pathname) && !isContentLocale(nextLocale)
        ? '/'
        : pathname;
    const href = params ? `${targetPathname}?${params}` : targetPathname;
    router.replace(href, { locale: nextLocale });
  };

  const toggleColorScheme = () => {
    const nextScheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(nextScheme);
    document.cookie = `mantine-color-scheme=${nextScheme}; path=/; max-age=31536000`;
  };

  const colorSchemeToggle = (
    <ActionIcon
      onClick={toggleColorScheme}
      variant="light"
      color="gray"
      size="lg"
      radius="md"
      aria-label={tNav('toggle_color_scheme')}
    >
      {!mounted ? (
        <div style={{ width: 20, height: 20 }} />
      ) : (
        colorScheme === 'dark' ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />
      )}
    </ActionIcon>
  );

  const languagePicker = (
    <Menu shadow="md" width={140} position="bottom-end" transitionProps={{ transition: 'pop-top-right' }}>
      <Menu.Target>
        <ActionIcon variant="light" color="gray" size="lg" radius="md" aria-label="change_language">
          <Languages size={20} strokeWidth={1.5} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{locale === 'ja' ? '言語を選択' :
          locale === 'pt' ? 'Selecionar Idioma' :
            locale === 'de' ? 'Sprache wählen' :
              locale === 'fr' ? 'Choisir la langue' :
                locale === 'es' ? 'Seleccionar idioma' :
                  'Select Language'}</Menu.Label>
        <Menu.Item
          onClick={() => handleLocaleChange('en')}
          fw={locale === 'en' ? 700 : 400}
        >
          English
        </Menu.Item>
        <Menu.Item
          onClick={() => handleLocaleChange('ja')}
          fw={locale === 'ja' ? 700 : 400}
        >
          日本語
        </Menu.Item>
        <Menu.Item
          onClick={() => handleLocaleChange('pt')}
          fw={locale === 'pt' ? 700 : 400}
        >
          Português
        </Menu.Item>
        <Menu.Item
          onClick={() => handleLocaleChange('de')}
          fw={locale === 'de' ? 700 : 400}
        >
          Deutsch
        </Menu.Item>
        <Menu.Item
          onClick={() => handleLocaleChange('fr')}
          fw={locale === 'fr' ? 700 : 400}
        >
          Français
        </Menu.Item>
        <Menu.Item
          onClick={() => handleLocaleChange('es')}
          fw={locale === 'es' ? 700 : 400}
        >
          Español
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  const items = links.map((link) => {
    const isActive = pathname === link.link;
    const targetLocale = link.contentOnly && !isContentLocale(locale) ? 'en' : locale;
    return (
      <Link
        key={link.labelKey}
        href={link.link}
        locale={targetLocale}
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
      {/* 以前は size="sm" 定義でしたが、項目が増えたため wider な "lg" に変更 */}
      <Container size="lg" className={classes.inner}>
        <Link href="/" className={classes.logo}>
          <Image src="/icon128.svg" alt="logo" width={24} height={24} style={{ position: 'relative', top: '2px' }} priority />
          <Title order={3} fw={700} m={0} style={{ lineHeight: 1 }}>{t('title')}</Title>
        </Link>

        <Group gap="md" visibleFrom="sm">
          <Group gap={5}>
            {items}
          </Group>
          <Group gap="xs">
            {colorSchemeToggle}
            {languagePicker}
          </Group>
        </Group>

        <Group gap="xs" hiddenFrom="sm">
          {colorSchemeToggle}
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
          position="right"
          hiddenFrom="sm"
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
