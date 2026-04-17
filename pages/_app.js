import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
<link rel="icon" type="image/png" href="/logo-full.png" />
<link rel="shortcut icon" href="/logo-full.png" />
<link rel="apple-touch-icon" href="/logo-full.png" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
