import type { Metadata } from "next";
import Link from "next/link";
import { Table, Td, Th } from "@/components/admin/Table";
import { Button } from "@/components/ui/Button";
import { isCollectionLive } from "@/modules/collections/schema";
import { listAllCollectionsAdmin } from "@/modules/collections/server/admin";

export const metadata: Metadata = { title: "Collections — Admin — RYMX" };

export default async function AdminCollectionsPage() {
  const collections = await listAllCollectionsAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">Collections</h1>
        <Button href="/admin/collections/new">New collection</Button>
      </div>

      {collections.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">No collections yet.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Products</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.id}>
                <Td>
                  <Link
                    href={`/admin/collections/${collection.id}`}
                    className="hover:text-rymx-gold"
                  >
                    {collection.title}
                  </Link>
                </Td>
                <Td>{collection.productIds.length}</Td>
                <Td>
                  {isCollectionLive(collection.publishAt)
                    ? "Live"
                    : `Scheduled — ${collection.publishAt!.toLocaleString()}`}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
