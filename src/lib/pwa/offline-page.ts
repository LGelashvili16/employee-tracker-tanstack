import { APP_NAME } from '../app.ts'

// This document must render without React, authentication, or a network connection.
export const offlinePage = `<!doctype html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#1c1c1c">
  <meta name="robots" content="noindex, nofollow">
  <title>კავშირი შეწყვეტილია | ${APP_NAME}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>
    :root { color-scheme: light dark; --background: #f7f7f7; --card: #fff; --text: #262626; --muted: #666; --border: #dedede; --button: #303030; --button-text: #fff; }
    @media (prefers-color-scheme: dark) { :root { --background: #141414; --card: #1c1c1c; --text: #ededed; --muted: #aaa; --border: #383838; --button: #ededed; --button-text: #1c1c1c; } }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100svh; display: grid; place-items: center; padding: 24px; background: var(--background); color: var(--text); font-family: system-ui, sans-serif; }
    main { width: 100%; max-width: 460px; padding: 36px 28px; border: 1px solid var(--border); border-radius: 16px; background: var(--card); text-align: center; }
    .brand { display: flex; justify-content: center; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; }
    .brand img { border-radius: 10px; }
    .connection { width: 48px; height: 48px; margin: 32px auto 16px; color: var(--muted); }
    h1 { margin: 0 0 16px; font-size: 26px; line-height: 1.5; }
    p { margin: 0 0 24px; color: var(--muted); font-size: 15px; line-height: 1.8; }
    a { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; border-radius: 8px; padding: 10px 24px; background: var(--button); color: var(--button-text); text-decoration: none; font-size: 14px; font-weight: 600; }
    a:focus-visible { outline: 3px solid var(--text); outline-offset: 4px; }
    .note { margin: 24px 0 0; font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <div class="brand"><img src="/icons/icon-192.png" width="40" height="40" alt="">${APP_NAME}</div>
    <svg class="connection" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m3 3 18 18M8.5 16.5a5 5 0 0 1 7 0M12 20h.01M6 12a9 9 0 0 1 3-1.6M15.5 10.7A9 9 0 0 1 18 12M2 8a15 15 0 0 1 3-1.9M9 4.3A15 15 0 0 1 22 8"/></svg>
    <h1>ინტერნეტთან კავშირი არ არის</h1>
    <p>შეამოწმეთ ინტერნეტთან კავშირი და სცადეთ ხელახლა. თქვენი სამუშაო სივრცე კავშირის აღდგენის შემდეგ გახდება ხელმისაწვდომი.</p>
    <a href="">ხელახლა ცდა</a>
    <p class="note">დროის აღრიცხვასა და ცვლილებების შენახვას ინტერნეტთან კავშირი სჭირდება. ოფლაინ მოქმედებები არ ინახება და მოგვიანებით არ იგზავნება.</p>
  </main>
</body>
</html>`
