import Script from "next/script";
import { getNonce } from "@/lib/nonce";

// Media-buying/tracking pixel prep. CSP (src/proxy.ts) already allowlists
// connect.facebook.net/www.facebook.com and analytics.tiktok.com. Each pixel
// is entirely opt-in via its own env var — renders nothing (safe no-op) until
// a real ID is supplied. Fires PageView on load; use trackEvent() from
// src/lib/analytics/trackEvent.ts for later conversion events (add-to-cart,
// checkout, purchase).
export async function PixelScripts() {
  const nonce = await getNonce();
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

  if (!metaPixelId && !tiktokPixelId) return null;

  return (
    <>
      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive" nonce={nonce}>
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`}
        </Script>
      )}
      {tiktokPixelId && (
        <Script id="tiktok-pixel" strategy="afterInteractive" nonce={nonce}>
          {`!function (w, d, t) {
w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=d.createElement("script");a.type="text/javascript",a.async=!0,a.src=i+"?sdkid="+e+"&lib="+t;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};
ttq.load('${tiktokPixelId}');
ttq.page();
}(window, document, 'ttq');`}
        </Script>
      )}
    </>
  );
}
