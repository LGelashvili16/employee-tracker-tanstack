export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | თანამშრომლების მართვა` },
      { name: 'description', content: description },
      // Internal employment pages and auth screens must not appear in search results.
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }
}
