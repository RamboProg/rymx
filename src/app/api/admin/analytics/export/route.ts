import { NextResponse } from "next/server";
import { formatEGP } from "@/lib/money";
import {
  getDiscountPerformanceReport,
  getSalesReport,
  getTopProductsReport,
} from "@/modules/analytics/server";
import { toCsv } from "@/modules/analytics/services/csv";
import { listVariantsAcrossProducts } from "@/modules/inventory/server";
import { getSessionClaims } from "@/modules/rbac/server";
import { isStaff } from "@/modules/rbac/services/permissions";

export const runtime = "nodejs";

const REPORTS = ["sales", "products", "discounts", "inventory"] as const;
type Report = (typeof REPORTS)[number];

function isReport(value: string | null): value is Report {
  return REPORTS.includes(value as Report);
}

export async function GET(request: Request) {
  const claims = await getSessionClaims();
  if (!claims || !isStaff(claims.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = new URL(request.url).searchParams.get("report");
  if (!isReport(report)) {
    return NextResponse.json({ error: "Unknown report" }, { status: 400 });
  }

  let csv: string;
  switch (report) {
    case "sales": {
      const rows = await getSalesReport(90);
      csv = toCsv(
        ["date", "orders", "revenue"],
        rows.map((r) => [r.date, r.orderCount, formatEGP(r.revenueMinor)]),
      );
      break;
    }
    case "products": {
      const rows = await getTopProductsReport(100);
      csv = toCsv(
        ["product", "quantity sold", "revenue"],
        rows.map((r) => [r.title, r.quantitySold, formatEGP(r.revenueMinor)]),
      );
      break;
    }
    case "discounts": {
      const rows = await getDiscountPerformanceReport();
      csv = toCsv(
        ["code", "redemptions", "discount given"],
        rows.map((r) => [r.code, r.redeemedCount, formatEGP(r.discountGivenMinor)]),
      );
      break;
    }
    case "inventory": {
      const rows = await listVariantsAcrossProducts();
      csv = toCsv(
        ["product", "sku", "stock", "unit price", "retail value"],
        rows.map((r) => [
          r.productTitle,
          r.sku,
          r.stock,
          formatEGP(r.priceMinor),
          formatEGP(r.stock * r.priceMinor),
        ]),
      );
      break;
    }
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report}.csv"`,
    },
  });
}
