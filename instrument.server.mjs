import * as Sentry from '@sentry/tanstackstart-react'

const sentryDsn =
  import.meta.env?.VITE_SENTRY_DSN ?? process.env.VITE_SENTRY_DSN

if (!sentryDsn) {
  console.warn('VITE_SENTRY_DSN is not defined. Sentry is not running.')
} else {
  Sentry.init({
    dsn: sentryDsn,
    // Disable default PII (IP, cookies, authorization headers) per OWASP/Sentry privacy policy
    sendDefaultPii: false,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.request?.headers) {
        for (const key of Object.keys(event.request.headers)) {
          if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'cookie') {
            delete event.request.headers[key]
          }
        }
      }
      return event
    },
  })
}
