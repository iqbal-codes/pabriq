import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { FormGrid, FormRoot, useAppForm } from "#/components/app/form";
import { Button } from "#/components/ui/button";
import { useConfirmPortalOrder, usePortalOrder } from "../hooks";
import type { PortalOrder } from "../model";

type PortalPageProps = { token: string };

export function PortalPage({ token }: PortalPageProps) {
  const { data } = usePortalOrder(token);
  const t = useTranslations("portal");

  if (!data.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">
            {t("notFound")}
          </h1>
        </div>
      </div>
    );
  }

  const order = data.order;

  if (order.status === "pending") {
    return <PendingView order={order} />;
  }

  if (order.status === "draft") {
    return <DraftView order={order} />;
  }

  if (order.status === "rejected") {
    return <RejectedView order={order} />;
  }

  return <ProgressView order={order} />;
}

function PendingView({ order }: { order: PortalOrder }) {
  const t = useTranslations("portal");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="mx-4 max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-xl font-semibold text-card-foreground">
          {t("waitApproval")}
        </h1>
        {order.orderNumber && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("orderNumber")}: {order.orderNumber}
          </p>
        )}
      </div>
    </div>
  );
}

function DraftView({ order }: { order: PortalOrder }) {
  const t = useTranslations("portal");

  const form = useAppForm({
    defaultValues: {
      guestName: "",
      guestPhone: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await confirmOrder.mutateAsync({
          orderId: order.id,
          guestName: value.guestName,
          guestPhone: value.guestPhone,
        });

        if (!result.ok) {
          toast.error(t("confirmFailed"));
        }
      } catch {
        toast.error(t("confirmFailed"));
      }
    },
  });

  const confirmOrder = useConfirmPortalOrder();

  async function handleConfirm() {
    try {
      const result = await confirmOrder.mutateAsync({ orderId: order.id });
      if (!result.ok) {
        toast.error(t("confirmFailed"));
      }
    } catch {
      toast.error(t("confirmFailed"));
    }
  }

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="mb-6 text-xl font-semibold text-foreground">
          {t("title")}
        </h1>

        <div className="space-y-6">
          {order.customerId ? (
            <CustomerInfoCard order={order} />
          ) : (
            <FormRoot form={form}>
              <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-4 text-sm font-medium text-card-foreground">
                  {t("customerInfo")}
                </h2>

                <FormGrid columns={1}>
                  <form.AppField
                    name="guestName"
                    validators={{
                      onChange: ({ value }) =>
                        value.trim() ? undefined : t("required"),
                    }}
                  >
                    {(field) => (
                      <field.TextField
                        label={t("guestName")}
                        placeholder={t("guestNamePlaceholder")}
                      />
                    )}
                  </form.AppField>

                  <form.AppField
                    name="guestPhone"
                    validators={{
                      onChange: ({ value }) =>
                        value.trim() ? undefined : t("required"),
                    }}
                  >
                    {(field) => (
                      <field.PhoneField
                        label={t("guestPhone")}
                        placeholder={t("guestPhonePlaceholder")}
                      />
                    )}
                  </form.AppField>
                </FormGrid>
              </div>
            </FormRoot>
          )}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-4 text-sm font-medium text-card-foreground">
              {t("shippingAddress")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {order.shippingAddress
                ? `${order.shippingAddress.areaName}, ${order.shippingAddress.streetAddress}`
                : t("noShippingAddress")}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-4 text-sm font-medium text-card-foreground">
              {t("lineItems")}
            </h2>
            <div className="space-y-3">
              {order.lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 border-b border-border pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground">
                      {item.name || item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("quantity")}: {item.quantity} ×{" "}
                      {new Intl.NumberFormat("en-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(item.unitPrice)}
                    </p>
                    {item.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-card-foreground">
                    {new Intl.NumberFormat("en-ID", {
                      style: "currency",
                      currency: "IDR",
                    }).format(item.total)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end border-t border-border pt-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("orderTotal")}
                </p>
                <p className="text-lg font-semibold text-card-foreground">
                  {new Intl.NumberFormat("en-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(order.total)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={handleConfirm}
              disabled={confirmOrder.isPending}
            >
              {confirmOrder.isPending ? t("submitting") : t("submit")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerInfoCard({ order }: { order: PortalOrder }) {
  const t = useTranslations("portal");

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-4 text-sm font-medium text-card-foreground">
        {t("customerInfo")}
      </h2>
      <p className="text-sm text-card-foreground">
        {order.customerName ?? t("guestCustomer")}
      </p>
      {order.customerPhone && (
        <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
      )}
    </div>
  );
}

function RejectedView({ order }: { order: PortalOrder }) {
  const t = useTranslations("portal");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="mx-4 max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold text-card-foreground">
          {t("rejectedTitle")}
        </h1>
        {order.rejectReason && (
          <p className="mt-2 text-sm text-muted-foreground">
            {order.rejectReason}
          </p>
        )}
        <Button type="button" className="mt-4 w-full">
          {t("contactAdmin")}
        </Button>

        <div className="mt-8 border-t border-border pt-6 text-left">
          <h2 className="mb-4 text-sm font-medium text-card-foreground">
            {t("orderSummary")}
          </h2>
          <div className="space-y-3">
            {order.lineItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-card-foreground">
                  {item.name || item.productName} × {item.quantity}
                </span>
                <span className="font-medium text-card-foreground">
                  {new Intl.NumberFormat("en-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(item.total)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-border pt-4">
            <span className="font-medium text-card-foreground">
              {t("orderTotal")}
            </span>
            <span className="font-semibold text-card-foreground">
              {new Intl.NumberFormat("en-ID", {
                style: "currency",
                currency: "IDR",
              }).format(order.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressView({ order }: { order: PortalOrder }) {
  const t = useTranslations("portal");

  const statusLabel: Record<string, string> = {
    approved: t("statusApproved"),
    production: t("statusProduction"),
    in_delivery: t("statusInDelivery"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
  };

  const isCompleted = order.status === "completed";

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-card-foreground">
              {t("orderSummary")}
            </h1>
            {order.orderNumber && (
              <p className="text-sm text-muted-foreground">
                {order.orderNumber}
              </p>
            )}
            {order.status && (
              <span className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {statusLabel[order.status] ?? order.status}
              </span>
            )}
          </div>

          {isCompleted && (
            <div className="mb-6 rounded-lg bg-secondary p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="text-sm text-secondary-foreground">
                {t("completedThanks")}
              </p>
            </div>
          )}

          <div className="mb-6 space-y-3">
            {order.lineItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 border-b border-border pb-3 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    {item.name || item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("quantity")}: {item.quantity} ×{" "}
                    {new Intl.NumberFormat("en-ID", {
                      style: "currency",
                      currency: "IDR",
                    }).format(item.unitPrice)}
                  </p>
                  {item.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium text-card-foreground">
                  {new Intl.NumberFormat("en-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(item.total)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("orderTotal")}</p>
              <p className="text-lg font-semibold text-card-foreground">
                {new Intl.NumberFormat("en-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(order.total)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
