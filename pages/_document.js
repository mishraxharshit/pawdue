import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f6f5f1" />
        <meta name="description" content="PawDue tracks each dog's breed-specific grooming cycle and sends WhatsApp/SMS reminders automatically, so no client quietly drifts away." />
        {/* Inline SVG favicon - the same paw + "due" mark used in the nav/footer, so the tab icon matches the brand without a separate image asset. */}
        <link
          rel="icon"
          href={
            "data:image/svg+xml," +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
                '<rect width="40" height="40" rx="11" fill="#2B5D4C"/>' +
                '<circle cx="20" cy="24" r="7.2" fill="#fff"/>' +
                '<circle cx="11.5" cy="15.5" r="3.4" fill="#fff"/>' +
                '<circle cx="20" cy="11.5" r="3.6" fill="#fff"/>' +
                '<circle cx="28.5" cy="15.5" r="3.4" fill="#fff"/>' +
                '<circle cx="30" cy="30" r="6" fill="#C98A3D" stroke="#2B5D4C" stroke-width="1.5"/>' +
              "</svg>"
            )
          }
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
