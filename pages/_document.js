// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document'

const GA_TRACKING_ID = 'G-T5564DJCJY'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png" />

        {/* Google Analytics (gtag.js) */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </Head>
      <body>
        {/* Theme boot — runs before the page paints so light-mode users never
            see a flash of the dark theme on load or navigation. Reads the same
            'theme' key the Navbar toggle writes. Keep this the FIRST thing
            inside <body>. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  if (localStorage.getItem('theme') === 'light') {
                    document.body.classList.add('light');
                    var m = document.querySelector('meta[name="theme-color"]');
                    if (m) m.setAttribute('content', '#ffffff');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
