import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" type="image/png" href="/favicon.png?v=3" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png?v=3" />
        <link rel="apple-touch-icon" href="/favicon.png?v=3" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
