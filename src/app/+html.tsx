import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/** Web shell: makes WeightRank installable ("Add to Home Screen") on iPhone and Android browsers. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
        <meta name="theme-color" content="#07080A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WeightRank" />
        <meta name="description" content="Your camera counts every clean rep. Duel friends, climb the ranks. Free." />
        <link rel="manifest" href="/weightrank/manifest.json" />
        <link rel="apple-touch-icon" href="/weightrank/icon-180.png" />
        <title>WeightRank</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: "html,body,#root{background:#07080A;height:100%}body{overscroll-behavior:none}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
