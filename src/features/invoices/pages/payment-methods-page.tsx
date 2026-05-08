import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import type {
  AppColumnDef,
  DataTableLabels,
} from "#/components/app/data-table";
import { DataTable } from "#/components/app/data-table";
import { FormGrid, FormRoot, useAppForm } from "#/components/app/form";
import { PageContent } from "#/components/app/page-shell/page-content";
import { PageHeader } from "#/components/app/page-shell/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import {
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  usePaymentMethods,
  useUpdatePaymentMethod,
} from "#/features/invoices/hooks";
import type { PaymentMethod } from "#/features/invoices/model";

const TYPE_LABEL_KEYS: Record<string, string> = {
  bank_transfer: "bankTransfer",
  payment_gateway: "paymentGateway",
};

export function PaymentMethodsPage() {
  const t = useTranslations("settings");
  const ct = useTranslations("common");
  const dt = useTranslations("dataTable");

  const { data: methods, isLoading } = usePaymentMethods();
  const createPaymentMethod = useCreatePaymentMethod();
  const updatePaymentMethod = useUpdatePaymentMethod();
  const deletePaymentMethod = useDeletePaymentMethod();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);

  const form = useAppForm({
    defaultValues: {
      name: "",
      type: "bank_transfer" as string,
      bankName: "",
      accountNumber: "",
      accountHolder: "",
      instructions: "",
      isDefault: false,
      active: true,
    },
    onSubmit: async ({ value }) => {
      const derivedName =
        value.type === "bank_transfer"
          ? [value.bankName, value.accountNumber].filter(Boolean).join(" - ") ||
            t("bankTransfer")
          : t("paymentGateway");
      const payload = {
        name: derivedName,
        type: value.type,
        bankName: value.bankName || null,
        accountNumber: value.accountNumber || null,
        accountHolder: value.accountHolder || null,
        instructions: value.instructions || null,
        isDefault: value.isDefault,
        active: value.active,
      };
      if (editingId) {
        const result = await updatePaymentMethod.mutateAsync({
          id: editingId,
          ...payload,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
      } else {
        const result = await createPaymentMethod.mutateAsync({
          orgId: "",
          ...payload,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
      }
      toast.success(t("saved"));
      setDialogOpen(false);
      form.reset();
      setEditingId(null);
    },
  });

  function openEdit(method: PaymentMethod) {
    setEditingId(method.id);
    form.setFieldValue("type", method.type);
    form.setFieldValue("bankName", method.bankName ?? "");
    form.setFieldValue("accountNumber", method.accountNumber ?? "");
    form.setFieldValue("accountHolder", method.accountHolder ?? "");
    form.setFieldValue("instructions", method.instructions ?? "");
    form.setFieldValue("isDefault", method.isDefault);
    form.setFieldValue("active", method.active);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      form.reset();
      setEditingId(null);
    }
    setDialogOpen(open);
  }

  const columns: AppColumnDef<PaymentMethod>[] = [
    {
      id: "type",
      header: ct("type"),
      meta: { label: ct("type"), mobileRole: "badge" },
      cell: ({ row }) => {
        const labelKey =
          TYPE_LABEL_KEYS[row.original.type] ?? row.original.type;
        return <Badge variant="secondary">{t(labelKey)}</Badge>;
      },
    },
    {
      id: "bankName",
      header: t("bankName"),
      meta: { label: t("bankName"), mobileRole: "meta" },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.bankName ?? "—"}
        </span>
      ),
    },
    {
      id: "account",
      header: t("accountNumber"),
      meta: { label: t("accountNumber"), mobileRole: "meta" },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.accountNumber
            ? `${row.original.accountNumber}${row.original.accountHolder ? ` (${row.original.accountHolder})` : ""}`
            : "—"}
        </span>
      ),
    },
    {
      id: "isDefault",
      header: t("defaultPayment"),
      meta: { label: t("defaultPayment"), mobileRole: "badge" },
      cell: ({ row }) =>
        row.original.isDefault ? <Badge>{t("defaultPayment")}</Badge> : null,
    },
    {
      id: "active",
      header: ct("status"),
      meta: { label: ct("status"), mobileRole: "badge" },
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? t("active") : t("inactive")}
        </Badge>
      ),
    },
  ];

  const labels: DataTableLabels = {
    clearFilters: dt("clearFilters"),
    columnVisibility: dt("columnVisibility"),
    errorRetry: dt("errorRetry"),
    errorTitle: dt("errorTitle"),
    firstPage: dt("firstPage"),
    lastPage: dt("lastPage"),
    loading: dt("loading"),
    nextPage: dt("nextPage"),
    of: dt("of"),
    page: dt("page"),
    perPage: dt("perPage"),
    previousPage: dt("previousPage"),
    resetColumns: dt("resetColumns"),
    rowsSelected: (selected: number, total: number) =>
      dt("rowsSelected", { selected, total }),
    visibleRows: (from: number, to: number, total: number) =>
      dt("visibleRows", { from, to, total }),
  };

  const methodList = methods ?? [];

  return (
    <>
      <PageHeader
        title={t("paymentMethods")}
        primaryAction={{
          label: t("addPaymentMethod"),
          onClick: () => {
            form.reset();
            setEditingId(null);
            setDialogOpen(true);
          },
        }}
      />

      <DataTable
        columns={columns}
        data={methodList}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        labels={labels}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
        page={1}
        perPage={methodList.length || 1}
        tableId="payment-methods"
        totalRows={methodList.length}
        emptyTitle={t("noPaymentMethods")}
        emptyDescription={t("noPaymentMethodsDesc")}
        noResultsTitle={t("noPaymentMethods")}
        hasActiveFilters={false}
        rowActions={(method: PaymentMethod) => (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              tooltip={t("editPaymentMethod")}
              onClick={() => openEdit(method)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              tooltip={t("deletePaymentMethod")}
              onClick={() => setDeleteTarget(method)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("editPaymentMethod") : t("addPaymentMethod")}
            </DialogTitle>
          </DialogHeader>
          <FormRoot form={form}>
            <FormGrid columns={1}>
              <form.AppField name="type">
                {(field) => (
                  <field.SelectField
                    label={ct("type")}
                    options={[
                      { value: "bank_transfer", label: t("bankTransfer") },
                      { value: "payment_gateway", label: t("paymentGateway") },
                    ]}
                  />
                )}
              </form.AppField>

              <form.AppField name="bankName">
                {(field) => <field.TextField label={t("bankName")} />}
              </form.AppField>

              <form.AppField name="accountNumber">
                {(field) => <field.TextField label={t("accountNumber")} />}
              </form.AppField>

              <form.AppField name="accountHolder">
                {(field) => <field.TextField label={t("accountHolder")} />}
              </form.AppField>

              <form.AppField name="instructions">
                {(field) => <field.TextareaField label={t("instructions")} />}
              </form.AppField>

              <form.AppField name="isDefault">
                {(field) => (
                  <div className="flex items-center justify-between">
                    <Label>{t("defaultPayment")}</Label>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={(v) => field.handleChange(v)}
                    />
                  </div>
                )}
              </form.AppField>

              <form.AppField name="active">
                {(field) => (
                  <div className="flex items-center justify-between">
                    <Label>{ct("status")}</Label>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={(v) => field.handleChange(v)}
                    />
                  </div>
                )}
              </form.AppField>
            </FormGrid>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                {ct("cancel")}
              </Button>
              <form.AppForm>
                <form.SubmitButton>
                  {editingId ? t("editPaymentMethod") : t("addPaymentMethod")}
                </form.SubmitButton>
              </form.AppForm>
            </div>
          </FormRoot>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deletePaymentMethod")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deletePaymentMethodConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ct("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deletePaymentMethod.mutate(deleteTarget.id);
                }
                setDeleteTarget(null);
              }}
            >
              {t("deletePaymentMethod")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
