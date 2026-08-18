import "server-only";

// Table-based HTML email shell matching the site's dark-gold brand
// (src/app/globals.css: --color-rymx-bg/-card/-gold/-cream). Every style is
// inline and every layout element is a <table> — Gmail webmail and many
// other clients strip <head>/<style> and don't support flex/grid, so this
// intentionally avoids both. Brand hex values are hardcoded (CSS custom
// properties aren't supported in email).
//
// No image logo exists anywhere in the repo (public/ only has a .stl 3D
// model) — the site's own wordmark is text-only everywhere (Syne, bold,
// tracked-out), so the header reproduces that as styled text instead.
// Google Fonts (Syne/Archivo/JetBrains Mono) won't reliably load in email
// clients, so each gets a system-font fallback stack approximating its look.

const BG = "#100d0a";
const CARD = "#0a0908";
const GOLD = "#e8c170";
const GOLD_MUTED = "#7a6533"; // divider — email clients don't reliably support opacity
const CREAM = "#f4f1ea";
const CREAM_MUTED = "#8a8578";

const DISPLAY_FONT = "'Century Gothic','Trebuchet MS',Verdana,sans-serif"; // Syne fallback
const SANS_FONT = "Arial,Helvetica,sans-serif"; // Archivo fallback
const MONO_FONT = "'Courier New',Courier,monospace"; // JetBrains Mono fallback

export function renderEmailShell(params: { title: string; bodyHtml: string }): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
  </head>
  <body style="margin:0;padding:0;background:${BG};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <!--[if mso]>
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td>
          <![endif]-->
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${CARD};border-radius:8px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 24px 8px 24px;">
                <div style="font-family:${DISPLAY_FONT};font-size:22px;font-weight:bold;letter-spacing:4px;color:${GOLD};">RYMX</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 24px 24px 24px;">
                <div style="font-family:${MONO_FONT};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">${params.title}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px;">
                <div style="height:1px;line-height:1px;background:${GOLD_MUTED};font-size:1px;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;font-family:${SANS_FONT};font-size:15px;line-height:1.6;color:${CREAM};">
                ${params.bodyHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 24px 32px 24px;font-family:${SANS_FONT};font-size:11px;color:${CREAM_MUTED};">
                This is an automated email from RYMX.
              </td>
            </tr>
          </table>
          <!--[if mso]>
          </td></tr></table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
