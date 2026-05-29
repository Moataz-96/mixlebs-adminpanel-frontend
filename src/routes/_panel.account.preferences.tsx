import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sliders, Save, MapPin, ChevronDown, Sun, Moon, Monitor } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { parseServerError } from "@/lib/api/error";
import { getPreferences, updatePreferences } from "@/lib/api/account.functions";
import { listCourierLocations } from "@/lib/api/couriers.functions";
import { listLanguages } from "@/lib/api/locations.functions";
import { PREF_TIMEZONES } from "@/lib/constants";

export const Route = createFileRoute("/_panel/account/preferences")({
  head: () => ({ meta: [{ title: "Preferences — Mixlebs Admin" }] }),
  component: PreferencesPage,
});

const schema = z.object({
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  location_id: z.string().min(1, "Required"),
  language_id: z.string().min(1, "Required"),
  timezone: z.string().min(1, "Required"),
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
  notification: z.boolean(),
  filters: z.string().refine((v) => {
    if (!v.trim()) return true;
    try {
      JSON.parse(v);
      return true;
    } catch {
      return false;
    }
  }, "filtersInvalid"),
});
type Values = z.infer<typeof schema>;

function PreferencesPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const prefsQuery = useQuery({
    queryKey: ["account-preferences"],
    queryFn: () => getPreferences(),
    staleTime: 30 * 1000,
    retry: false,
  });

  // CLOSES ENTRY 028 — Location / Language pickers source from the real BE
  // lookups (region-scoped composite Location list + P8 languages) instead of
  // the prior static constants.
  const locationsQuery = useQuery({
    queryKey: ["pref-location-lookup"],
    queryFn: () => listCourierLocations({ data: { page_size: 200 } }),
    staleTime: 5 * 60 * 1000,
  });
  const languagesQuery = useQuery({
    queryKey: ["pref-language-lookup"],
    queryFn: () => listLanguages(),
    staleTime: 5 * 60 * 1000,
  });
  const locationOptions = locationsQuery.data?.results ?? [];
  const languageOptions = languagesQuery.data?.results ?? [];

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      latitude: "",
      longitude: "",
      location_id: "",
      language_id: "",
      timezone: "Asia/Beirut",
      theme: "SYSTEM",
      notification: true,
      filters: "{}",
    },
  });
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // Seed from BE preferences once loaded.
  useEffect(() => {
    const p = prefsQuery.data;
    if (p) {
      reset({
        latitude: p.latitude ?? "",
        longitude: p.longitude ?? "",
        location_id: p.location_id != null ? String(p.location_id) : "",
        language_id: p.language_id != null ? String(p.language_id) : "",
        timezone: p.timezone ?? "Asia/Beirut",
        theme: (p.theme as Values["theme"]) ?? "SYSTEM",
        notification: p.notification,
        filters: p.filters ? JSON.stringify(p.filters, null, 2) : "{}",
      });
    }
  }, [prefsQuery.data, reset]);

  async function onSubmit(values: Values) {
    try {
      await updatePreferences({
        data: {
          latitude: values.latitude || undefined,
          longitude: values.longitude || undefined,
          location_id: values.location_id ? Number(values.location_id) : undefined,
          language_id: values.language_id ? Number(values.language_id) : undefined,
          timezone: values.timezone || undefined,
          // BE ThemeEnum has only LIGHT|DARK; SYSTEM is a FE-only choice.
          theme: values.theme === "SYSTEM" ? undefined : values.theme,
          notification: values.notification,
          filters: values.filters.trim() ? JSON.parse(values.filters) : undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["account-preferences"] });
      toast.success(t("account.prefSaved"));
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }

  const themeOptions: { value: "LIGHT" | "DARK" | "SYSTEM"; label: string; icon: typeof Sun }[] = [
    { value: "LIGHT", label: t("account.themeLight"), icon: Sun },
    { value: "DARK", label: t("account.themeDark"), icon: Moon },
    { value: "SYSTEM", label: t("account.themeSystem"), icon: Monitor },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("account.prefTitle")}
        description={t("account.prefSubtitle")}
        actions={
          <Button
            type="submit"
            form="prefs-form"
            disabled={isSubmitting}
            className="bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <Save className="me-1.5 h-4 w-4" /> {t("account.prefSave")}
          </Button>
        }
      />

      <form
        id="prefs-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-4 lg:grid-cols-2"
      >
        {/* Location */}
        <Card className="border-0 bg-card p-5 shadow-soft">
          <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
            <MapPin className="h-4 w-4" /> {t("account.sectionLocation")}
          </h3>
          <div className="space-y-4">
            <div>
              <Label>{t("account.locationField")}</Label>
              <Controller
                control={control}
                name="location_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("account.selectLocation")} />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {[l.country_name, l.city_name].filter(Boolean).join(" · ") ||
                            `#${l.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="latitude">{t("account.latitude")}</Label>
                <Input
                  id="latitude"
                  dir="ltr"
                  inputMode="decimal"
                  className="mt-1 font-mono"
                  placeholder="33.8938"
                  {...register("latitude")}
                />
              </div>
              <div>
                <Label htmlFor="longitude">{t("account.longitude")}</Label>
                <Input
                  id="longitude"
                  dir="ltr"
                  inputMode="decimal"
                  className="mt-1 font-mono"
                  placeholder="35.5018"
                  {...register("longitude")}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-background/40 p-4 text-center">
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground">{t("account.mapPlaceholder")}</p>
              <Button type="button" size="sm" variant="outline" className="mt-3">
                <MapPin className="me-1.5 h-3.5 w-3.5" /> {t("account.pickOnMap")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("account.coordsOptional")}</p>
          </div>
        </Card>

        {/* Interface */}
        <Card className="border-0 bg-card p-5 shadow-soft">
          <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
            <Sliders className="h-4 w-4" /> {t("account.sectionInterface")}
          </h3>
          <div className="space-y-4">
            <div>
              <Label>{t("account.languageField")}</Label>
              <Controller
                control={control}
                name="language_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("account.selectLanguage")} />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>{t("account.timezoneField")}</Label>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("account.selectTimezone")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PREF_TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">{t("account.themeField")}</Label>
              <Controller
                control={control}
                name="theme"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid grid-cols-3 gap-2"
                  >
                    {themeOptions.map((o) => (
                      <Label
                        key={o.value}
                        htmlFor={`theme-${o.value}`}
                        className={cn(
                          "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border bg-background/40 p-3 text-xs transition hover:bg-background/80",
                          field.value === o.value && "border-primary bg-primary/5 text-primary",
                        )}
                      >
                        <RadioGroupItem
                          id={`theme-${o.value}`}
                          value={o.value}
                          className="sr-only"
                        />
                        <o.icon className="h-4 w-4" />
                        {o.label}
                      </Label>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-background/40 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">{t("account.notificationMaster")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("account.notificationMasterDesc")}
                </p>
              </div>
              <Controller
                control={control}
                name="notification"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </div>
        </Card>

        {/* Advanced — filters JSON */}
        <Card className="border-0 bg-card p-5 shadow-soft lg:col-span-2">
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex w-full items-center justify-between text-start">
                <div>
                  <h3 className="font-display text-base font-semibold">
                    {t("account.sectionAdvanced")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {advancedOpen ? t("account.hideAdvanced") : t("account.showAdvanced")}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition",
                    advancedOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <Label htmlFor="filters">{t("account.filtersField")}</Label>
              <Textarea
                id="filters"
                dir="ltr"
                rows={6}
                className="mt-1 font-mono text-xs"
                aria-invalid={!!errors.filters}
                {...register("filters")}
              />
              {errors.filters ? (
                <p className="mt-1 text-xs text-destructive">{t("account.filtersInvalid")}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{t("account.filtersDesc")}</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </form>
    </div>
  );
}
