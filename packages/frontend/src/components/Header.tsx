'use client';

import { useState, useEffect } from 'react';
import { Container, Group, Title, Burger, Drawer, Stack, ActionIcon, Menu, useMantineColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Languages, Sun, Moon, Info, Compass, FileText, Shield, ChevronRight } from 'lucide-react';
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

  const drawerItems = links.map((link) => {
    const isActive = pathname === link.link;
    const targetLocale = link.contentOnly && !isContentLocale(locale) ? 'en' : locale;
    
    let Icon = Info;
    if (link.labelKey === 'directory') Icon = Compass;
    if (link.labelKey === 'terms') Icon = FileText;
    if (link.labelKey === 'privacy') Icon = Shield;

    return (
      <Link
        key={link.labelKey}
        href={link.link}
        locale={targetLocale}
        className={`${classes.drawerLink} ${isActive ? classes.drawerLinkActive : ''}`}
        onClick={close}
        data-active={isActive || undefined}
      >
        <Group justify="space-between" w="100%" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <div className={`${classes.drawerIconWrapper} ${isActive ? classes.drawerIconActive : ''}`}>
              <Icon size={18} strokeWidth={2} />
            </div>
            <Stack gap={2}>
              <span className={classes.drawerLinkLabel}>{tNav(link.labelKey)}</span>
              <span className={classes.drawerLinkDesc}>
                {link.labelKey === 'about' && (locale === 'ja' ? 'AtPassportについて知る' : 'Learn more about @passport')}
                {link.labelKey === 'directory' && (locale === 'ja' ? '登録済みの公開ドメイン一覧' : 'Browse verified public domains')}
                {link.labelKey === 'terms' && (locale === 'ja' ? 'サービス利用規約' : 'Read terms of service')}
                {link.labelKey === 'privacy' && (locale === 'ja' ? '個人情報保護方針' : 'Read privacy policy')}
              </span>
            </Stack>
          </Group>
          <ChevronRight size={16} className={classes.drawerArrow} />
        </Group>
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
          size="300px"
          padding="md"
          title={t('title')}
          position="right"
          hiddenFrom="sm"
          zIndex={1000}
          classNames={{
            content: classes.drawerContent,
            header: classes.drawerHeader,
            title: classes.drawerTitle,
          }}
          overlayProps={{
            backgroundOpacity: 0.15,
            blur: 4,
          }}
        >
          <Stack gap="xl" h="calc(100dvh - 110px)" justify="space-between" mt="md">
            <Stack gap="xs">
              {drawerItems}
            </Stack>
            <Stack gap="xs" style={{ borderTop: '1px solid light-dark(rgba(0, 0, 0, 0.06), rgba(255, 255, 255, 0.06))', paddingTop: 'var(--mantine-spacing-md)' }}>
              <Group gap="xs" justify="center">
                <Image src="/icon128.svg" alt="logo" width={18} height={18} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'light-dark(var(--mantine-color-gray-6), var(--mantine-color-dark-3))' }}>
                  AtPassport
                </span>
              </Group>
              <span style={{ fontSize: '10px', textAlign: 'center', color: 'light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-4))' }}>
                © {new Date().getFullYear()} AtPassport
              </span>
            </Stack>
          </Stack>
        </Drawer>
      </Container>
    </header>
  );
}
