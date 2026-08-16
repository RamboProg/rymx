import Image from "next/image";
import Link from "next/link";
import { formatEGP } from "@/lib/money";
import type { Product } from "../schema";

export function ProductCard({ product }: { product: Product }) {
  const image = product.media[0];
  const onSale =
    product.compareAtMinor != null && product.compareAtMinor > product.minPriceMinor;

  return (
    <Link href={`/shop/${product.slug}`} className="group flex flex-col gap-3">
      <div className="bg-rymx-card relative aspect-[3/4] w-full overflow-hidden rounded-md">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || product.title}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-rymx-cream/20 text-sm tracking-[0.2em] uppercase">
              RYMX
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-rymx-cream font-sans text-sm">{product.title}</h3>
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-rymx-gold font-mono text-xs">{formatEGP(product.minPriceMinor)}</p>
          {onSale && (
            <p className="text-rymx-cream/40 font-mono text-xs line-through">
              {formatEGP(product.compareAtMinor!)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
