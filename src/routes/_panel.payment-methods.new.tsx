import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Save, CreditCard, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useT } from "@/lib/i18n";
import { parseServerError, fieldMessage } from "@/lib/api/error";
import {
  createPaymentMethod,
  updatePaymentMethod,
  type PaymentMethod,
} from "@/lib/api/payment_methods.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_panel/payment-methods/new")({
  head: () => ({ meta: [{ title: "New payment method — Mixlebs Admin" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    store_id: typeof s.store_id === "string" ? s.store_id : undefined,
  }),
  component: NewPaymentMethod,
});

function NewPaymentMethod() {
  const { store_id } = Route.useSearch();
  return <PaymentMethodEditor mode="create" storeId={store_id} />;
}

const CURRENT_YEAR = 2026;

const schema = z.object({
  brand: z.enum(["Visa", "Mastercard", "Other"]),
  holder_name: z.string().min(1).max(255),
  exp_month: z.coerce.number().int().min(1).max(12),
  exp_year: z.coerce
    .number()
    .int()
    .min(CURRENT_YEAR)
    .max(CURRENT_YEAR + 20),
  token: z.string().min(1),
  is_default: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function PaymentMethodEditor({
  mode,
  value,
  storeId,
}: {
  mode: "create" | "edit";
  value?: PaymentMethod;
  storeId?: string;
}) {
  const t = useT();
  const navigate = useNavigate();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand: (value?.brand as Values["brand"]) ?? "Visa",
      holder_name: value?.holder_name ?? "",
      exp_month: value?.exp_month ?? 1,
      exp_year: value?.exp_year ?? CURRENT_YEAR + 2,
      // token is write-only; the BE never returns it. Edit starts blank and only
      // re-sends a token when the operator re-tokenizes the card.
      token: "",
      is_default: value?.is_default ?? false,
    },
  });
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(values: Values) {
    try {
      if (mode === "edit" && value) {
        await updatePaymentMethod({
          data: {
            id: value.id,
            brand: values.brand,
            holder_name: values.holder_name,
            exp_month: values.exp_month,
            exp_year: values.exp_year,
            ...(values.token ? { token: values.token } : {}),
            is_default: values.is_default,
          },
        });
      } else {
        await createPaymentMethod({
          data: {
            brand: values.brand,
            holder_name: values.holder_name,
            exp_month: values.exp_month,
            exp_year: values.exp_year,
            token: values.token,
            is_default: values.is_default,
            store_id: storeId,
          },
        });
      }
      toast.success(t("finance.payments.saved"));
      navigate({ to: "/payment-methods" });
    } catch (err) {
      const info = parseServerError(err);
      const keys: (keyof Values)[] = [
        "brand",
        "holder_name",
        "exp_month",
        "exp_year",
        "token",
        "is_default",
      ];
      let mapped = false;
      for (const k of keys) {
        const msg = fieldMessage(info.fieldErrors, k as string);
        if (msg) {
          setError(k, { message: msg });
          mapped = true;
        }
      }
      if (!mapped) toast.error(info.message);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title={
          mode === "create" ? t("finance.payments.createTitle") : t("finance.payments.editTitle")
        }
        description={t("finance.payments.editorDescription")}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/payment-methods">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("finance.payments.backToMethods")}
              </Link>
            </Button>
            <Button
              type="submit"
              form="pm-form"
              disabled={isSubmitting}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <Save className="me-1.5 h-4 w-4" /> {t("finance.payments.save")}
            </Button>
          </>
        }
      />

      <form
        id="pm-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        <Card className="border-0 bg-card p-6 shadow-soft">
          <h3 className="mb-5 flex items-center gap-2 font-display text-base font-semibold">
            <CreditCard className="h-4 w-4" /> {t("finance.payments.tokenWidgetTitle")}
          </h3>
          <div className="grid gap-5 md:grid-cols-2">
            <Fld label={t("finance.payments.brand")} required error={errors.brand?.message}>
              <Controller
                control={control}
                name="brand"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Visa">{t("finance.payments.brandVisa")}</SelectItem>
                      <SelectItem value="Mastercard">
                        {t("finance.payments.brandMastercard")}
                      </SelectItem>
                      <SelectItem value="Other">{t("finance.payments.brandOther")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Fld>
            <Fld
              label={t("finance.payments.holderName")}
              required
              error={errors.holder_name?.message}
            >
              <Input
                defaultValue=""
                aria-invalid={!!errors.holder_name}
                {...register("holder_name")}
              />
            </Fld>
            <Fld label={t("finance.payments.expMonth")} required error={errors.exp_month?.message}>
              <Input
                dir="ltr"
                type="number"
                min={1}
                max={12}
                className="font-mono"
                aria-invalid={!!errors.exp_month}
                {...register("exp_month")}
              />
            </Fld>
            <Fld label={t("finance.payments.expYear")} required error={errors.exp_year?.message}>
              <Input
                dir="ltr"
                type="number"
                min={CURRENT_YEAR}
                className="font-mono"
                aria-invalid={!!errors.exp_year}
                {...register("exp_year")}
              />
            </Fld>
          </div>

          <div className="mt-6 rounded-xl border border-dashed bg-muted/30 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-success" /> {t("finance.payments.token")}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {t("finance.payments.tokenWidgetHint")}
            </p>
            <Input
              dir="ltr"
              className="font-mono"
              placeholder={t("finance.payments.tokenPlaceholder")}
              aria-invalid={!!errors.token}
              {...register("token")}
            />
            {errors.token && (
              <p className="mt-1 text-xs text-destructive">{errors.token.message}</p>
            )}
          </div>
        </Card>

        <aside className="space-y-6">
          <Card className="border-0 bg-card p-6 shadow-soft">
            <h3 className="mb-4 font-display text-base font-semibold">{t("common.status")}</h3>
            <div className="flex items-center justify-between border-b py-2.5 last:border-0">
              <span className="text-sm">{t("finance.payments.makeDefault")}</span>
              <Controller
                control={control}
                name="is_default"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </Card>
        </aside>
      </form>
    </div>
  );
}

function Fld({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
