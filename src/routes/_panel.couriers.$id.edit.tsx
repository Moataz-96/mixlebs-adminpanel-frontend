import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Save, Truck, MapPin, Plus, Trash2, Upload, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ForbiddenState } from "@/components/shared/states";
import { usePermissions } from "@/components/shared/Can";
import { useT } from "@/lib/i18n";
import { parseServerError, fieldMessage } from "@/lib/api/error";
import {
  getCourier,
  createCourier,
  updateCourier,
  listDeliveryAreas,
  addDeliveryArea,
  removeDeliveryArea,
  setDefaultDeliveryArea,
  listCourierLocations,
  type Courier,
  type DeliveryArea,
} from "@/lib/api/couriers.functions";
import { listRegions } from "@/lib/api/locations.functions";
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

export const Route = createFileRoute("/_panel/couriers/$id/edit")({
  head: () => ({ meta: [{ title: "Edit courier — Mixlebs Admin" }] }),
  component: EditCourier,
});

// ENTRY 024a (remediation): region / locations pickers are now backed by live
// lookups — Region from P8 (/admin/locations/regions/) and Location from the
// region-scoped /couriers/locations/ endpoint. The form persists region_id +
// location_ids alongside the scalar courier fields. The locations chip input
// stores Location ids (as strings); chip labels show the city/country name.

const schema = z.object({
  name: z.string().min(1).max(255),
  rank: z.coerce.number().int().min(0),
  eta_days: z.coerce.number().int().min(0),
  base_fee: z.coerce.number().min(0),
  region_id: z.string().min(1),
  locations: z.array(z.string()),
});
type Values = z.infer<typeof schema>;

function num(s: string | number | null | undefined): number {
  const n = typeof s === "number" ? s : parseFloat(String(s ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function EditCourier() {
  const t = useT();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const queryClient = useQueryClient();
  const { id } = Route.useParams();
  const isNew = id === "new";

  const courierQuery = useQuery({
    queryKey: ["courier", id],
    queryFn: () => getCourier({ data: { id } }),
    enabled: !isNew && has("couriers.update"),
  });
  const c: Courier | undefined = courierQuery.data;

  const areasQuery = useQuery({
    queryKey: ["courier-areas", id],
    queryFn: () => listDeliveryAreas({ data: { id, page_size: 200 } }),
    enabled: !isNew && has("couriers.update"),
  });
  const areas: DeliveryArea[] = useMemo(
    () => areasQuery.data?.results ?? [],
    [areasQuery.data],
  );

  // ENTRY 024a: live Region + Location lookups for the pickers.
  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: () => listRegions(),
    enabled: has("couriers.update"),
  });
  const regions = useMemo(
    () => (regionsQuery.data?.results ?? []).map((r) => ({ id: String(r.id), name: r.name })),
    [regionsQuery.data],
  );

  const locationsQuery = useQuery({
    queryKey: ["courier-locations"],
    queryFn: () => listCourierLocations({ data: { page_size: 200 } }),
    enabled: has("couriers.update"),
  });
  const locationOptions = useMemo(
    () =>
      (locationsQuery.data?.results ?? []).map((l) => ({
        id: String(l.id),
        label:
          [l.city_name, l.country_name].filter(Boolean).join(", ") || `#${l.id}`,
      })),
    [locationsQuery.data],
  );
  const locationLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of locationOptions) map.set(o.id, o.label);
    return map;
  }, [locationOptions]);

  const courierLocationIds = useMemo<string[]>(() => {
    const raw = c?.locations;
    if (Array.isArray(raw)) return raw.map((x) => String(x));
    return [];
  }, [c]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: c?.name ?? "",
      rank: c?.rank ?? 1,
      eta_days: c?.eta_days ?? 2,
      base_fee: num(c?.base_fee),
      region_id: c?.region_id != null ? String(c.region_id) : (regions[0]?.id ?? ""),
      locations: courierLocationIds,
    },
  });
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = form;
  const [isActive, setIsActive] = useState(true);

  const removeAreaMutation = useMutation({
    mutationFn: (areaId: number) => removeDeliveryArea({ data: { id, area_id: areaId } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["courier-areas", id] }),
    onError: (err) => toast.error(parseServerError(err).message),
  });

  // ENTRY 024b: add + set-default delivery-area write paths (were P6 no-ops).
  const addAreaMutation = useMutation({
    mutationFn: (locationId: number) =>
      addDeliveryArea({ data: { id, location_id: locationId } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["courier-areas", id] }),
    onError: (err) => toast.error(parseServerError(err).message),
  });
  const setDefaultMutation = useMutation({
    mutationFn: (areaId: number) =>
      setDefaultDeliveryArea({ data: { id, area_id: areaId, is_default: true } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["courier-areas", id] }),
    onError: (err) => toast.error(parseServerError(err).message),
  });

  if (!has("couriers.update")) {
    return (
      <div className="p-6">
        <ForbiddenState perms={["couriers.update"]} />
      </div>
    );
  }

  async function onSubmit(values: Values) {
    // ENTRY 024a: region_id + location_ids are now persisted alongside scalars.
    const region_id = values.region_id ? Number(values.region_id) : null;
    const location_ids = values.locations.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    try {
      if (isNew) {
        await createCourier({
          data: {
            name: values.name,
            rank: values.rank,
            eta_days: values.eta_days,
            base_fee: values.base_fee,
            region_id,
            location_ids,
          },
        });
      } else {
        await updateCourier({
          data: {
            id,
            name: values.name,
            rank: values.rank,
            eta_days: values.eta_days,
            base_fee: values.base_fee,
            region_id,
            location_ids,
          },
        });
      }
      toast.success(t("finance.couriers.saved"));
      navigate({ to: "/couriers" });
    } catch (err) {
      const info = parseServerError(err);
      const keys: (keyof Values)[] = ["name", "rank", "eta_days", "base_fee"];
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

  function removeArea(aid: number) {
    removeAreaMutation.mutate(aid);
  }

  // ENTRY 024b: "Add area" adds the first region Location not yet a delivery
  // area (the frozen UI exposes no per-row location picker); set-default flips
  // the chosen area via PATCH. Both are guarded by couriers.update BE-side.
  function addArea() {
    if (isNew) {
      toast.info(t("finance.couriers.daEmpty"));
      return;
    }
    const used = new Set(areas.map((a) => a.location_id));
    const next = locationOptions.find((o) => !used.has(Number(o.id)));
    if (!next) {
      toast.info(t("finance.couriers.daEmpty"));
      return;
    }
    addAreaMutation.mutate(Number(next.id));
  }
  function setDefaultArea(aid: number) {
    setDefaultMutation.mutate(aid);
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
                        {regions.map((r) => (
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
                                {locationLabel.get(l) ?? `#${l}`} ×
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {locationOptions
                          .filter((o) => !field.value.includes(o.id))
                          .map((o) => (
                            <button
                              type="button"
                              key={o.id}
                              onClick={() => field.onChange([...field.value, o.id])}
                            >
                              <Badge variant="outline" className="cursor-pointer">
                                <Plus className="me-1 h-3 w-3" />
                                {o.label}
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
                      <TableCell className="font-medium">
                        {locationLabel.get(String(a.location_id)) ?? `#${a.location_id}`}
                      </TableCell>
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
                {c?.name ? c.name.slice(0, 2).toUpperCase() : "?"}
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
