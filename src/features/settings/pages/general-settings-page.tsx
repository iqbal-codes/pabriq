import { useStore } from "@tanstack/react-form";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from "#/components/app/form";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
  useOrgSettings,
  useUpdateOrgSettings,
} from "#/features/settings/hooks";

export function GeneralSettingsPage() {
  const t = useTranslations("settings");
  const { data: settings, isLoading } = useOrgSettings();
  const updateOrgSettings = useUpdateOrgSettings();

  const form = useAppForm({
    defaultValues: {
      name: settings?.name ?? "",
      slug: settings?.slug ?? "",
      phone: settings?.phone ?? "",
      logoAssetId: settings?.logoAssetId ?? null,
    },
    onSubmit: async ({ value }) => {
      const result = await updateOrgSettings.mutateAsync({
        name: value.name,
        phone: value.phone || null,
        logoAssetId: value.logoAssetId,
      });
      if (result.ok) {
        toast.success(t("saved"));
      } else {
        toast.error(t("saveFailed"));
      }
    },
  });

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  if (isLoading) return null;

  return (
    <FormRoot form={form}>
      <Card>
        <CardContent>
          <FormGrid columns={1}>
            <form.AppField name="logoAssetId">
              {(field) => (
                <field.PhotoUploadField
                  label={t("logo")}
                  ownerType="organization"
                  usage="logo"
                />
              )}
            </form.AppField>
            <form.AppField name="name">
              {(field) => <field.TextField label={t("orgName")} />}
            </form.AppField>
            <form.AppField name="slug">
              {(field) => <field.TextField label={t("orgSlug")} disabled />}
            </form.AppField>
            <form.AppField name="phone">
              {(field) => <field.PhoneField label={t("phone")} />}
            </form.AppField>
          </FormGrid>
        </CardContent>
      </Card>
      <FormActions>
        <form.AppForm>
          <form.SubmitButton isLoading={isSubmitting}>
            {t("general")}
          </form.SubmitButton>
        </form.AppForm>
      </FormActions>
    </FormRoot>
  );
}
