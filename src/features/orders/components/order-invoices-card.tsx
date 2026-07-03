import { Link } from "@tanstack/react-router";
import { Eye, Printer } from "lucide-react";
import { useTranslations } from "use-intl";
import { AssetImage } from "#/components/app/asset-image";
import { StatusBadge } from "#/components/status-badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import type { InvoiceRow } from "#/features/invoices/model";
import { currencyFormatter } from "./view-order-utils";

export function OrderInvoicesCard({
  orderInvoices,
  invoicePayments,
}: {
  orderInvoices: InvoiceRow[];
  invoicePayments: Record<string, Array<{ id: string; proofAssetId: string }>>;
}) {
  const it = useTranslations("invoices");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{it("title")}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {orderInvoices.length}{" "}
            {orderInvoices.length === 1 ? "invoice" : "invoices"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {orderInvoices.length === 0 ? (
          <p className="px-6 text-sm text-muted-foreground">
            {it("noInvoices")}
          </p>
        ) : (
          <div className="mx-4 rounded-xl border bg-muted/50 p-1.5">
            <div className="rounded-lg border bg-background overflow-hidden divide-y divide-border">
              {orderInvoices.map((inv) => {
                const payments = invoicePayments?.[inv.id] ?? [];
                const proofPayments = payments.filter((p) => p.proofAssetId);

                return (
                  <div
                    key={inv.id}
                    className="px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    {/* Top row: number + status + actions */}
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/invoices/$id"
                            params={{ id: inv.id }}
                            className="font-medium text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded truncate"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          <StatusBadge status={inv.status} />
                        </div>
                      </div>

                      {/* Right: total + icon actions */}
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-1">
                          <p className="font-semibold text-sm tabular-nums">
                            {currencyFormatter.format(inv.total)}
                          </p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon-sm" asChild>
                              <a
                                href={`/api/documents/invoices/${inv.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Printer className="size-3.5" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{it("printInvoice")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <Link to="/invoices/$id" params={{ id: inv.id }}>
                                <Eye className="size-3.5" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{it("viewInvoice")}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Payment proof images */}
                    {proofPayments.length > 0 && (
                      <div className="mt-2.5">
                        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          {it("paymentProof")}
                        </p>
                        <div className="flex gap-1.5">
                          {proofPayments.map((p) => (
                            <div
                              key={p.id}
                              className="relative size-12 overflow-hidden rounded-md ring-1 ring-border"
                            >
                              <AssetImage
                                assetId={p.proofAssetId}
                                assetKind="image"
                                className="size-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
