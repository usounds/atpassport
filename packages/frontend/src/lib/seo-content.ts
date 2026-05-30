export type SeoContentLocale = 'en' | 'ja';

export const seoContentLocales = ['en', 'ja'] as const;

export type GuideSlug = 'atproto-login' | 'bluesky-handle-login' | 'atproto-oauth-helper';

export type SeoContentPage = {
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  sections: Array<{
    title: string;
    body: string;
    items?: string[];
  }>;
};

export const guidePages: Record<GuideSlug, Record<SeoContentLocale, SeoContentPage>> = {
  'atproto-login': {
    en: {
      title: 'atproto login with @passport',
      description: 'A short guide to using @passport as an atproto login helper for handle selection and app authentication flows.',
      eyebrow: 'atproto login',
      intro: '@passport helps atproto users move through login flows without typing the same handle again and again.',
      sections: [
        {
          title: 'What @passport does',
          body: '@passport stores the handles you choose in your browser session and lets supported apps ask you to select one during login.',
          items: [
            'Users register one or more atproto handles once.',
            'Supported apps can open @passport as a handle picker.',
            'The selected handle is returned to the app so it can continue its own authentication flow.',
          ],
        },
        {
          title: 'What @passport does not do',
          body: '@passport is not a password manager and does not store your Bluesky password, OAuth tokens, or app sessions.',
        },
        {
          title: 'When it helps',
          body: 'It is useful for apps that need an atproto handle before starting their own OAuth, PDS, or identity resolution flow.',
        },
      ],
    },
    ja: {
      title: 'atproto login と @passport',
      description: '@passport を atproto ログイン時のハンドル選択・認証補助として使うための短い説明です。',
      eyebrow: 'atproto login',
      intro: '@passport は、atproto サービスのログイン時に毎回ハンドルを入力する手間を減らすための補助ツールです。',
      sections: [
        {
          title: '@passport がすること',
          body: '@passport は、利用者が登録した atproto ハンドルを保持し、対応アプリのログイン時に選択できるようにします。',
          items: [
            '利用者は 1 つ以上の atproto ハンドルを登録します。',
            '対応アプリは @passport をハンドル選択画面として開けます。',
            '選択されたハンドルをアプリへ戻し、アプリ側の認証フローを続行できます。',
          ],
        },
        {
          title: '@passport がしないこと',
          body: '@passport はパスワードマネージャーではありません。Bluesky のパスワード、OAuth トークン、アプリのセッションは保存しません。',
        },
        {
          title: '向いている場面',
          body: 'OAuth、PDS、identity resolution を始める前に atproto ハンドルが必要なアプリで役立ちます。',
        },
      ],
    },
  },
  'bluesky-handle-login': {
    en: {
      title: 'Bluesky handle login helper',
      description: 'Use @passport to reduce repeated Bluesky handle entry when logging in to atproto apps.',
      eyebrow: 'Bluesky handle login',
      intro: 'Bluesky handles are portable atproto identifiers, but typing them repeatedly across apps is easy to get wrong.',
      sections: [
        {
          title: 'Why handle entry is repetitive',
          body: 'Many atproto apps need a handle before they can resolve your DID, find your PDS, or begin an OAuth flow.',
        },
        {
          title: 'How @passport helps',
          body: '@passport lets you keep a small list of handles and choose the right one when a supported app requests it.',
          items: [
            'Works with custom domains such as alice.example.com.',
            'Supports multiple handles for people who use several accounts.',
            'Can be shared to another device with a short-lived sync link.',
          ],
        },
        {
          title: 'For users and developers',
          body: 'Users get fewer typing mistakes. Developers get a simple way to request a handle before continuing their own login logic.',
        },
      ],
    },
    ja: {
      title: 'Bluesky ハンドルログイン補助',
      description: '@passport を使って、atproto アプリへのログイン時に Bluesky ハンドルを何度も入力する手間を減らします。',
      eyebrow: 'Bluesky handle login',
      intro: 'Bluesky のハンドルは atproto の識別子として使えますが、複数のアプリで毎回入力するとミスが起きやすくなります。',
      sections: [
        {
          title: 'なぜハンドル入力が繰り返されるのか',
          body: '多くの atproto アプリでは、DID の解決、PDS の検出、OAuth フロー開始の前にハンドルが必要です。',
        },
        {
          title: '@passport の補助',
          body: '@passport では登録済みハンドルの一覧から、対応アプリに渡すハンドルを選べます。',
          items: [
            'alice.example.com のような独自ドメインハンドルにも対応します。',
            '複数アカウントを使う人向けに複数ハンドルを登録できます。',
            '短時間だけ有効な同期リンクで別デバイスへ共有できます。',
          ],
        },
        {
          title: '利用者と開発者の両方に向けて',
          body: '利用者は入力ミスを減らせます。開発者は、自分のログイン処理を続ける前にシンプルにハンドルを受け取れます。',
        },
      ],
    },
  },
  'atproto-oauth-helper': {
    en: {
      title: 'atproto OAuth helper for handle-first apps',
      description: '@passport can help atproto apps collect a user handle before starting OAuth, PDS discovery, or identity resolution.',
      eyebrow: 'atproto OAuth helper',
      intro: '@passport is a lightweight helper for apps that need a handle before they can start a complete atproto authentication flow.',
      sections: [
        {
          title: 'The handle-first problem',
          body: 'A decentralized atproto app often needs to know which handle or PDS to use before redirecting the user into authentication.',
        },
        {
          title: 'The @passport pattern',
          body: 'Your app sends users to @passport with a callback URL. @passport returns the selected handle and optional state parameters.',
          items: [
            'Use it as a picker before your own OAuth implementation.',
            'Keep authorization and token handling inside your app.',
            'Verify your domain to remove warnings in the @passport flow.',
          ],
        },
        {
          title: 'Security boundary',
          body: '@passport only assists with handle selection. Your app remains responsible for OAuth, session handling, and authorization decisions.',
        },
      ],
    },
    ja: {
      title: 'handle-first な atproto OAuth 補助',
      description: '@passport は、atproto アプリが OAuth、PDS 検出、identity resolution を始める前のハンドル取得を補助します。',
      eyebrow: 'atproto OAuth helper',
      intro: '@passport は、完全な atproto 認証フローを始める前にハンドルが必要なアプリのための軽量な補助ツールです。',
      sections: [
        {
          title: 'handle-first の課題',
          body: '分散型の atproto アプリでは、認証へ進む前にどのハンドルや PDS を使うか知る必要がある場合があります。',
        },
        {
          title: '@passport の使い方',
          body: 'アプリは callback URL を付けて @passport へ遷移します。@passport は選択されたハンドルと任意の state パラメータを返します。',
          items: [
            '自前の OAuth 実装の前段にあるハンドルピッカーとして使えます。',
            '認可やトークン管理はアプリ側に閉じたままにできます。',
            'ドメインを確認すると @passport フロー内の警告を解除できます。',
          ],
        },
        {
          title: 'セキュリティ境界',
          body: '@passport はハンドル選択だけを補助します。OAuth、セッション管理、認可判断はアプリ側の責任です。',
        },
      ],
    },
  },
};

export const supportedAppsPage: Record<SeoContentLocale, SeoContentPage> = {
  en: {
    title: 'Apps that support @passport',
    description: 'A list of apps and services that support @passport handle selection for atproto login flows.',
    eyebrow: 'Supported apps',
    intro: 'These apps can use @passport as part of their atproto handle selection or login experience.',
    sections: [
      {
        title: 'Native support',
        body: 'The following apps are mentioned by @passport as native integrations.',
        items: ['chavatar.app', 'skyblur.uk', 'rito.blue'],
      },
      {
        title: 'Domain verification',
        body: 'Developers can verify ownership of their domain so users see fewer warnings when using @passport with their app.',
      },
      {
        title: 'Browser extension fallback',
        body: 'Even when an app does not integrate @passport directly, users can use the browser extension to assist with handle input.',
      },
    ],
  },
  ja: {
    title: '@passport 対応アプリ',
    description: '@passport のハンドル選択に対応している atproto アプリやサービスの一覧です。',
    eyebrow: '対応アプリ',
    intro: 'これらのアプリは、atproto のハンドル選択やログイン体験の一部として @passport を利用できます。',
    sections: [
      {
        title: 'ネイティブ対応',
        body: '@passport でネイティブ連携として紹介しているアプリです。',
        items: ['chavatar.app', 'skyblur.uk', 'rito.blue'],
      },
      {
        title: 'ドメイン確認',
        body: '開発者はドメイン所有権を確認することで、@passport 利用時に表示される警告を減らせます。',
      },
      {
        title: 'ブラウザ拡張による補助',
        body: 'アプリが直接 @passport に対応していない場合でも、利用者はブラウザ拡張でハンドル入力を補助できます。',
      },
    ],
  },
};

export const developerGuidePage: Record<SeoContentLocale, SeoContentPage> = {
  en: {
    title: 'Implement @passport in an atproto app',
    description: 'A short implementation guide for adding @passport handle selection to an atproto app.',
    eyebrow: 'Developer guide',
    intro: 'Use @passport when your app needs a user handle before it can continue an atproto login flow.',
    sections: [
      {
        title: '1. Choose where handle selection happens',
        body: 'Add a Login with @passport or Add handle with @passport action before your app starts identity resolution or OAuth.',
      },
      {
        title: '2. Pass a callback URL',
        body: 'Send users to @passport with a callback URL. Your callback receives the selected handle and can continue your app-specific flow.',
      },
      {
        title: '3. Keep auth in your app',
        body: '@passport does not replace OAuth. Treat the returned handle as input to your own atproto authentication, session, and permission logic.',
      },
      {
        title: '4. Verify your domain',
        body: 'Use the developer portal to verify your domain and reduce warnings shown to users during the @passport flow.',
      },
    ],
  },
  ja: {
    title: 'atproto アプリに @passport を実装する',
    description: 'atproto アプリに @passport のハンドル選択を追加するための短い実装ガイドです。',
    eyebrow: '開発者向けガイド',
    intro: 'アプリが atproto ログインフローを続ける前にユーザーのハンドルを必要とする場合、@passport を利用できます。',
    sections: [
      {
        title: '1. ハンドル選択の位置を決める',
        body: 'identity resolution や OAuth を開始する前に、「@passport でログイン」または「@passport でハンドルを追加」の導線を置きます。',
      },
      {
        title: '2. callback URL を渡す',
        body: 'callback URL を付けて @passport に遷移します。callback 側で選択されたハンドルを受け取り、アプリ固有のフローを続けます。',
      },
      {
        title: '3. 認証はアプリ側で扱う',
        body: '@passport は OAuth の代替ではありません。返ってきたハンドルは、自分の atproto 認証・セッション・権限処理の入力として扱います。',
      },
      {
        title: '4. ドメインを確認する',
        body: '開発者ポータルでドメイン所有権を確認すると、@passport フロー中に利用者へ表示される警告を減らせます。',
      },
    ],
  },
};

export function getSeoContentLocale(locale: string): SeoContentLocale {
  return locale === 'ja' ? 'ja' : 'en';
}
