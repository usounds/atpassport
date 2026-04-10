import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['activeTab', 'scripting', 'clipboardWrite'],
    host_permissions: ['https://atpassport.net/*'],
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnrG3XYk7F8b7/S4jJTq5EPcAGjgm2WYJ0i2i9G5u7K1XkudEnewAvNbv8Tx4Oj2wlV4rqxeFuG1JL8eLml6YU0ycN2o+kYcAYCFKazIxHvse5qXa2LBhedGkdYTHKXc8Zt+K08qMRh64HrQtZoZPznnsDO5kgjzs7sn6U0c8W+EYYShkSZEDQZP8cILKeB9KDUWs7QdGQvsWHVGlSleDWy9o3fG65pY/JBkrfYl188VCMOwoYUJLBlKiWFLUbE0fbadqeEMppNI5qrVMq15yQXmSBkno3VHuMnyzHKrxuCJ7h4isZ5boBJ7/wo6q589FG7ZaJAu044Qoq//l4iUUxwIDAQAB',
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
    action: {
      default_icon: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: 'extension@atpassport.net',
        strict_min_version: '142.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
  vite: () => ({
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
  }),
});
