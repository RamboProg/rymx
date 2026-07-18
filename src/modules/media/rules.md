# media module — Storage rules

`media/{path}`: publicly readable (product/collection images are storefront
assets). All writes are denied at the rules layer — uploads happen
server-side via `uploadMediaAction` (`src/modules/media/server/actions.ts`)
using the Admin SDK, which validates MIME type and file size and requires
the caller to be signed in with a staff role before it ever touches
Storage.
