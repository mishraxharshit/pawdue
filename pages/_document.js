import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f6f5f1" />
        <meta name="description" content="PawDue tracks each dog's breed-specific grooming cycle and emails owners a reminder with a booking link when a dog is due, so regulars do not quietly drift away." />
        {/* Favicons as real files in /public. Google only shows a site icon in search results
            when it can fetch it from a normal URL; an inline data: icon is ignored. */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
