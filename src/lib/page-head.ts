import { APP_NAME } from './app'

export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | ${APP_NAME}` },
      { name: 'description', content: description },
      // Internal employment pages and auth screens must not appear in search results.
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }
}
