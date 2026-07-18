import type { Metadata } from "next";
import { Table, Td, Th } from "@/components/admin/Table";
import { InventoryTable } from "@/modules/inventory/components/InventoryTable";
import { listAdjustments, listVariantsAcrossProducts } from "@/modules/inventory/server";

export const metadata: Metadata = { title: "Inventory — Admin — RYMX" };

export default async function AdminInventoryPage() {
  const [rows, adjustments] = await Promise.all([
    listVariantsAcrossProducts(),
    listAdjustments(20),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">Inventory</h1>
        {rows.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">No variants yet.</p>
        ) : (
          <InventoryTable rows={rows} />
        )}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Recent adjustments</h2>
        {adjustments.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">No adjustments yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Change</Th>
                <Th>New stock</Th>
                <Th>Reason</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <Td>{adjustment.productTitle}</Td>
                  <Td>{adjustment.sku}</Td>
                  <Td>{adjustment.delta > 0 ? `+${adjustment.delta}` : adjustment.delta}</Td>
                  <Td>{adjustment.newStock}</Td>
                  <Td>{adjustment.reason}</Td>
                  <Td>{adjustment.createdAt.toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
