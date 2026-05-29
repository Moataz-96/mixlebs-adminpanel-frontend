import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Save, Truck, MapPin, Plus, Trash2, Upload, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ForbiddenState } from "@/components/shared/states";
import { usePermissions } from "@/components/shared/Can";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  COURIER_ROWS,
  DELIVERY_AREAS,
  REGIONS,
  LOCATIONS,
  type DeliveryAreaRow,
} from "@/lib/mock/finance";

export const Route = createFileRoute("/_panel/couriers/$id/edit")({
  head: () => ({ meta: [{ title: "Edit courier — Mixlebs Admin" }] }),
  component: EditCourier,
});

const schema = z.object({
  name: z.string().min(1).max(255),
  rank: z.coerce.number().int().min(0),
  eta_days: z.coerce.number().int().min(0),
  base_fee: z.coerce.number().min(0),
  region_id: z.string().min(1),
  locations: z.array(z.string()),
});
type Values = z.infer<typeof schema>;

function EditCourier() {
  const t = useT();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const { id } = Route.useParams();
  const isNew = id === "new";
  const c = isNew ? undefined : (COURIER_ROWS.find((x) => x.id === id) ?? COURIER_ROWS[0]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: c?.name ?? "",
      rank: c?.rank ?? COURIER_ROWS.length + 1,
      eta_days: c?.eta_days ?? 2,
      base_fee: c?.base_fee ?? 0,
      region_id: c?.region_id ?? REGIONS[0].id,
      locations: c ? LOCATIONS.slice(0, Math.min(3, LOCATIONS.length)) : [],
    },
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = form;
  const [isActive, setIsActive] = useState(c?.is_active ?? true);
  const [areas, setAreas] = useState<DeliveryAreaRow[]>(isNew ? [] : DELIVERY_AREAS);

  if (!has("couriers.update")) {
    return (
      <div className="p-6">
        <ForbiddenState perms={["couriers.update"]} />
      </div>
    );
  }

  function onSubmit(_values: Values) {
    toast.success(t("finance.couriers.saved"));
    navigate({ to: "/couriers" });
  }

  function addArea() {
    const used = new Set(areas.map((a) => a.location));
    const next = LOCATIONS.find((l) => !used.has(l));
    if (!next) return;
    setAreas([
      ...areas,
      { id: `da_${Date.now()}`, location: next, is_default: areas.length === 0 },
    ]);
  }
  function removeArea(aid: string) {
    setAreas(areas.filter((a) => a.id !== aid));
  }
  function setDefaultArea(aid: string) {
    setAreas(areas.map((a) => ({ ...a, is_default: a.id === aid })));
  }

  return (
    <div className="p-6">
      <PageHeader
        title={
          isNew
            ? t("finance.couriers.createTitle")
            : t("finance.couriers.editTitle", { name: c?.name ?? "" })
        }
        description={t("finance.couriers.editorDescription")}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/couriers">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("finance.couriers.backToCouriers")}
              </Link>
            </Button>
            <Button
              type="submit"
              form="courier-form"
              disabled={isSubmitting}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <Save className="me-1.5 h-4 w-4" /> {t("finance.couriers.save")}
            </Button>
          </>
        }
      />

      <form
        id="courier-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-6">
          <Card className="border-0 bg-card p-6 shadow-soft">
            <h3 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold">
              <Truck className="h-4 w-4" /> {t("finance.couriers.title")}
            </h3>
            <div className="grid gap-5 md:grid-cols-2">
              <Fld label={t("finance.couriers.name")} required error={errors.name?.message}>
                <Input aria-invalid={!!errors.name} {...register("name")} />
              </Fld>
              <Fld label={t("finance.couriers.rank")} required error={errors.rank?.message}>
                <Input
                  dir="ltr"
                  type="number"
                  className="font-mono"
                  aria-invalid={!!errors.rank}
                  {...register("rank")}
                />
              </Fld>
              <Fld label={t("finance.couriers.eta")} required error={errors.eta_days?.message}>
                <Input
                  dir="ltr"
                  type="number"
                  className="font-mono"
                  aria-invalid={!!errors.eta_days}
                  {...register("eta_days")}
                />
              </Fld>
              <Fld label={t("finance.couriers.baseFee")} required error={errors.base_fee?.message}>
                <Input
                  dir="ltr"
                  type="number"
                  step="0.01"
                  className="font-mono"
                  aria-invalid={!!errors.base_fee}
                  {...register("base_fee")}
                />
              </Fld>
              <Fld
                label={t("finance.couriers.region")}
                required
                error={errors.region_id?.message}
                className="md:col-span-2"
              >
                <Controller
                  control={control}
                  name="region_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={!!errors.region_id}>
                        <SelectValue placeholder={t("finance.couriers.regionPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Fld>
              <Controller
                control={control}
                name="locations"
                render={({ field }) => (
                  <Fld
                    label={t("finance.couriers.locations")}
                    hint={t("finance.couriers.locationsHint")}
                    className="md:col-span-2"
                  >
                    <div className="rounded-lg border bg-background p-2">
                      {field.value.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {field.value.map((l) => (
                            <button
                              type="button"
                              key={l}
                              onClick={() =>
                                field.onChange(field.value.filter((x: string) => x !== l))
                              }
                            >
                              <Badge
                                variant="outline"
                                className="cursor-pointer border-primary/40 bg-primary/10 text-primary"
                              >
                                {l} ×
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {LOCATIONS.filter((l) => !field.value.includes(l)).map((l) => (
                          <button
                            type="button"
                            key={l}
                            onClick={() => field.onChange([...field.value, l])}
                          >
                            <Badge variant="outline" className="cursor-pointer">
                              <Plus className="me-1 h-3 w-3" />
                              {l}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Fld>
                )}
              />
            </div>
          </Card>

          {/* Delivery areas sub-section */}
          <Card className="overflow-hidden border-0 shadow-soft">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <MapPin className="h-4 w-4" /> {t("finance.couriers.deliveryAreas")}
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addArea}>
                <Plus className="me-1 h-3.5 w-3.5" /> {t("finance.couriers.daAdd")}
              </Button>
            </div>
            {areas.length === 0 ? (
              <div className="grid h-28 place-items-center text-sm text-muted-foreground">
                {t("finance.couriers.daEmpty")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>{t("finance.couriers.daLocation")}</TableHead>
                    <TableHead className="text-center">{t("finance.couriers.daDefault")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areas.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.location}</TableCell>
                      <TableCell className="text-center">
                        {a.is_default ? (
                          <Badge
                            variant="outline"
                            className="border-primary/30 bg-primary/10 text-primary"
                          >
                            <Star className="me-1 h-3 w-3" /> {t("finance.couriers.daDefault")}
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => setDefaultArea(a.id)}
                          >
                            <Star className="me-1 h-3.5 w-3.5" /> {t("finance.couriers.daDefault")}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeArea(a.id)}
                          aria-label={t("finance.couriers.daRemove")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-0 bg-card p-6 shadow-soft">
            <h3 className="mb-4 font-display text-base font-semibold">
              {t("finance.couriers.logo")}
            </h3>
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-6">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-lg font-bold text-primary-foreground shadow-glow">
                {c?.logo ?? "?"}
              </div>
              <Button type="button" variant="outline" size="sm">
                <Upload className="me-1.5 h-3.5 w-3.5" /> {t("finance.couriers.logoUpload")}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {t("finance.couriers.logoHint")}
              </p>
            </div>
          </Card>
          <Card className="border-0 bg-card p-6 shadow-soft">
            <h3 className="mb-4 font-display text-base font-semibold">{t("common.status")}</h3>
            <div className="flex items-center justify-between border-b py-2.5 last:border-0">
              <span className="text-sm">{t("finance.couriers.active")}</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
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
  hint,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
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
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
