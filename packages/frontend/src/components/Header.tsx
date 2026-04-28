'use client';

import { useState, useEffect } from 'react';
import { Container, Group, Title, Burger, Drawer, Stack, ActionIcon, Menu, useMantineColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Languages, Sun, Moon, Info, LayoutGrid, Book, Shield } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import classes from './Header.module.css';

const links = [
  { link: '/about', labelKey: 'about', icon: Info },
  { link: '/directory', labelKey: 'directory', icon: LayoutGrid },
  { link: '/terms', labelKey: 'terms', icon: Book },
  { link: '/privacy', labelKey: 'privacy', icon: Shield },
];

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
    const href = params ? `${pathname}?${params}` : pathname;
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

  const renderItems = (isDrawer = false) => links.map((link, index) => {
    const isActive = pathname === link.link;
    const Icon = link.icon;
    return (
      <Link
        key={link.labelKey}
        href={link.link}
        className={`${isDrawer ? classes.drawerLink : classes.link} ${isActive ? (isDrawer ? classes.drawerLinkActive : classes.linkActive) : ''}`}
        onClick={close}
        data-active={isActive || undefined}
        style={{ '--index': index } as React.CSSProperties}
      >
        {isDrawer && <Icon size={20} className={classes.drawerIcon} />}
        {tNav(link.labelKey)}
      </Link>
    );
  });

  return (
    <header className={classes.header}>
      {/* 以前は size="sm" 定義でしたが、項目が増えたため wider な "lg" に変更 */}
      <Container size="lg" className={classes.inner}>
        <Link href="/" className={classes.logo}>
          <Image src="/icon128.svg" alt="logo" width={24} height={24} style={{ position: 'relative', top: '2px' }} />
          <Title order={3} fw={700} m={0} style={{ lineHeight: 1 }}>{t('title')}</Title>
        </Link>

        <Group gap="md" visibleFrom="sm">
          <Group gap={5}>
            {renderItems()}
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
          size="75%"
          padding="xl"
          position="right"
          hiddenFrom="sm"
          zIndex={1000}
          withCloseButton={false}
          styles={{
            content: { 
              backgroundColor: 'light-dark(rgba(255, 255, 255, 0.95), rgba(20, 20, 20, 0.8))',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            },
            body: {
              padding: 0
            }
          }}
        >
          <div className={classes.drawerHeader}>
            <div className={classes.logo}>
              <Image src="/icon128.svg" alt="logo" width={24} height={24} style={{ position: 'relative', top: '2px' }} />
              <Title order={3} fw={700} m={0} style={{ lineHeight: 1 }}>{t('title')}</Title>
            </div>
            <Burger
              opened={opened}
              onClick={close}
              size="sm"
              aria-label="Close navigation"
            />
          </div>
          <Stack gap={0} px="xl" py="md">
            {renderItems(true)}
          </Stack>
        </Drawer>
      </Container>
    </header>
  );
}
