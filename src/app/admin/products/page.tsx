import type { Metadata } from "next";
import Link from "next/link";
import { Table, Td, Th } from "@/components/admin/Table";
import { Button } from "@/components/ui/Button";
import { formatEGP } from "@/lib/money";
import { listAllProducts } from "@/modules/catalog/server/admin";

export const metadata: Metadata = { title: "Products — Admin — RYMX" };

export default async function AdminProductsPage() {
  const products = await listAllProducts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">Products</h1>
        <Button href="/admin/products/new">New product</Button>
      </div>

      {products.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">No products yet.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Category</Th>
              <Th>Price</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <Td>
                  <Link href={`/admin/products/${product.id}`} className="hover:text-rymx-gold">
                    {product.title}
                  </Link>
                </Td>
                <Td>{product.status}</Td>
                <Td>{product.category ?? "—"}</Td>
                <Td>{formatEGP(product.minPriceMinor)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
