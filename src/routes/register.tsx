import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Upload,
  Phone,
  Building2,
  MapPin,
  FileText,
  CreditCard,
  ShieldCheck,
  X,
  MapPinned,
  File as FileIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useT } from "@/lib/i18n";
import {
  sendPhoneCode,
  verifyPhone,
  uploadRegisterDocument,
  registerStore,
} from "@/lib/api/stores.functions";
import { useApp } from "@/lib/app-context";
import { parseServerError } from "@/lib/api/error";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Open your Mixlebs store — Apply to sell" },
      {
        name: "description",
        content:
          "5-step seller onboarding for Mixlebs: account, shop info, address, identity verification, and payout setup.",
      },
    ],
  }),
  // Optional ?ticket= handed back by the standalone /register/verify-phone screen.
  validateSearch: (s: Record<string, unknown>) => ({
    ticket: typeof s.ticket === "string" ? s.ticket : "",
  }),
  component: RegisterPage,
});

/* ─── validation ───────────────────────────────────────────────── */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[1-9]\d{6,14}$/;

// A captured/uploaded asset reference (mock — no real upload).
const assetRef = z.object({ asset_id: z.string(), name: z.string() });
type AssetRef = z.infer<typeof assetRef>;

const accountSchema = z
  .object({
    first_name: z.string().min(1, "Required").max(150),
    last_name: z.string().min(1, "Required").max(150),
    email: z.string().min(1, "Required").max(255).regex(EMAIL, "Enter a valid email"),
    phone: z
      .string()
      .min(1, "Required")
      .max(20)
      .refine((v) => PHONE.test(v.replace(/\s/g, "")), "Enter a valid phone"),
    password: z.string().min(8, "At least 8 characters"),
    password_confirm: z.string().min(1, "Required"),
    verification_ticket: z.string().min(1),
  })
  .refine((v) => v.password === v.password_confirm, {
    path: ["password_confirm"],
    message: "passwordsMismatch",
  });

const shopSchema = z.object({
  name_en: z.string().min(1, "Required").max(255),
  name_ar: z.string().min(1, "Required").max(255),
  about_en: z.string().max(2000).optional(),
  about_ar: z.string().max(2000).optional(),
  features_en: z.string().max(2000).optional(),
  features_ar: z.string().max(2000).optional(),
  target_audience_en: z.string().max(2000).optional(),
  target_audience_ar: z.string().max(2000).optional(),
  selling_promotions_en: z.string().max(2000).optional(),
  selling_promotions_ar: z.string().max(2000).optional(),
  category_id: z.string().optional(),
  default_language: z.enum(["en", "ar"]),
});

const addressSchema = z.object({
  location_id: z.string().min(1, "Required"),
  latitude: z.string().min(1, "Required"),
  longitude: z.string().min(1, "Required"),
  recipient_name: z.string().min(1, "Required").max(255),
  phone_number: z.string().min(1, "Required").max(20),
  governorate: z.string().min(1, "Required").max(100),
  area: z.string().max(100).optional(),
  postcode: z.string().max(100).optional(),
  street: z.string().min(1, "Required").max(255),
  building: z.coerce.number().int().min(0, "≥ 0"),
  floor: z.coerce.number().int().min(0, "≥ 0"),
  apartment: z.coerce.number().int().min(0, "≥ 0"),
  note: z.string().max(2000).optional(),
});

const identitySchema = z
  .object({
    account_type: z.enum(["INDIVIDUAL", "COMPANY"]),
    identity: z.string().min(1, "Required").max(255),
    first_name: z.string().min(1, "Required").max(150),
    middle_name: z.string().max(150).optional(),
    last_name: z.string().min(1, "Required").max(150),
    business_name: z.string().optional(),
    business_license_number: z.string().optional(),
    residential_address: z.string().min(1, "Required"),
    country_of_issue: z.string().min(2, "Required").max(3),
    expiration_date: z
      .string()
      .min(1, "Required")
      .refine((v) => new Date(v) > new Date(), "mustBeFuture"),
    dob: z
      .string()
      .min(1, "Required")
      .refine((v) => {
        const d = new Date(v);
        if (Number.isNaN(d.getTime()) || d >= new Date()) return false;
        const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
        return age >= 18;
      }, "mustBe18"),
    identity_front_side: assetRef.nullable(),
    identity_back_side: assetRef.nullable(),
    supporting_documents: z.array(assetRef),
  })
  .superRefine((v, ctx) => {
    if (v.account_type === "COMPANY") {
      if (!v.business_name)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["business_name"], message: "Required" });
      if (!v.business_license_number)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["business_license_number"],
          message: "Required",
        });
    }
    if (!v.identity_front_side)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identity_front_side"],
        message: "fileRequired",
      });
    if (!v.identity_back_side)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identity_back_side"],
        message: "fileRequired",
      });
  });

const paymentSchema = z.object({
  type: z.enum(["CC", "COD", "QR", "NS"]),
  brand: z.enum(["Visa", "Mastercard", "Other"]),
  holder_name: z.string().min(1, "Required").max(255),
  exp_month: z.coerce.number().int().min(1, "1–12").max(12, "1–12"),
  exp_year: z.coerce.number().int().min(new Date().getFullYear(), "Year in the past"),
  token: z.string().min(1, "Required"),
});

type AccountValues = z.infer<typeof accountSchema>;
type ShopValues = z.infer<typeof shopSchema>;
type AddressValues = z.infer<typeof addressSchema>;
type IdentityValues = z.infer<typeof identitySchema>;
type PaymentValues = z.infer<typeof paymentSchema>;

/* ─── component ─────────────────────────────────────────────────── */

function RegisterPage() {
  const t = useT();
  const navigate = useNavigate();
  const { signIn } = useApp();
  const { ticket } = Route.useSearch();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const STEPS = [
    { key: "account", label: t("auth.stepAccount"), icon: Phone },
    { key: "shop", label: t("auth.stepShop"), icon: Building2 },
    { key: "address", label: t("auth.stepAddress"), icon: MapPin },
    { key: "identity", label: t("auth.stepIdentity"), icon: FileText },
    { key: "payment", label: t("auth.stepPayment"), icon: CreditCard },
  ] as const;

  const accountForm = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      password_confirm: "",
      verification_ticket: "",
    },
  });
  const shopForm = useForm<ShopValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name_en: "",
      name_ar: "",
      about_en: "",
      about_ar: "",
      features_en: "",
      features_ar: "",
      target_audience_en: "",
      target_audience_ar: "",
      selling_promotions_en: "",
      selling_promotions_ar: "",
      category_id: "",
      default_language: "en",
    },
  });
  const addressForm = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      location_id: "",
      latitude: "",
      longitude: "",
      recipient_name: "",
      phone_number: "",
      governorate: "",
      area: "",
      postcode: "",
      street: "",
      building: 0,
      floor: 0,
      apartment: 0,
      note: "",
    },
  });
  const identityForm = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      account_type: "INDIVIDUAL",
      identity: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      business_name: "",
      business_license_number: "",
      residential_address: "",
      country_of_issue: "",
      expiration_date: "",
      dob: "",
      identity_front_side: null,
      identity_back_side: null,
      supporting_documents: [],
    },
  });
  const paymentForm = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      type: "CC",
      brand: "Visa",
      holder_name: "",
      exp_month: undefined as unknown as number,
      exp_year: undefined as unknown as number,
      token: "",
    },
  });

  // Seed the verification ticket if the standalone verify-phone screen handed
  // one back via ?ticket=.
  useEffect(() => {
    if (ticket) accountForm.setValue("verification_ticket", ticket, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  const stepForms = [accountForm, shopForm, addressForm, identityForm, paymentForm] as const;

  async function next() {
    const ok = await stepForms[step].trigger();
    if (!ok) {
      toast.error(t("auth.fixStepErrors"));
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function submitAll() {
    const ok = await paymentForm.trigger();
    if (!ok) {
      toast.error(t("auth.fixStepErrors"));
      return;
    }
    // Final atomic payload: { verification_ticket, user, shop, address, identity, payment }.
    // FE upload fields (identity_front_side / identity_back_side /
    // supporting_documents) carry the uploaded asset ids; map them to the BE
    // keys (identity_*_document_id / supporting_document_ids).
    const account = accountForm.getValues();
    const shop = shopForm.getValues();
    const address = addressForm.getValues();
    const id = identityForm.getValues();
    const payment = paymentForm.getValues();

    const payload = {
      verification_ticket: account.verification_ticket,
      user: {
        first_name: account.first_name,
        last_name: account.last_name,
        email: account.email,
        phone: account.phone,
        password: account.password,
      },
      shop: {
        name_en: shop.name_en,
        name_ar: shop.name_ar,
        about_en: shop.about_en || undefined,
        about_ar: shop.about_ar || undefined,
        features_en: shop.features_en || undefined,
        features_ar: shop.features_ar || undefined,
        target_audience_en: shop.target_audience_en || undefined,
        target_audience_ar: shop.target_audience_ar || undefined,
        selling_promotions_en: shop.selling_promotions_en || undefined,
        selling_promotions_ar: shop.selling_promotions_ar || undefined,
        category_id: shop.category_id || undefined,
        default_language: shop.default_language,
      },
      address: {
        location_id: address.location_id,
        latitude: address.latitude,
        longitude: address.longitude,
        recipient_name: address.recipient_name,
        phone_number: address.phone_number,
        governorate: address.governorate,
        area: address.area || undefined,
        postcode: address.postcode || undefined,
        street: address.street,
        building: address.building,
        floor: address.floor,
        apartment: address.apartment,
        note: address.note || undefined,
      },
      identity: {
        account_type: id.account_type,
        identity: id.identity,
        first_name: id.first_name,
        middle_name: id.middle_name || undefined,
        last_name: id.last_name,
        business_name: id.business_name || undefined,
        business_license_number: id.business_license_number || undefined,
        residential_address: id.residential_address,
        country_of_issue: id.country_of_issue,
        expiration_date: id.expiration_date,
        dob: id.dob,
        identity_front_side_document_id: id.identity_front_side?.asset_id ?? "",
        identity_back_side_document_id: id.identity_back_side?.asset_id ?? "",
        supporting_document_ids: id.supporting_documents.map((d) => d.asset_id),
      },
      // payment.type (CC/COD/QR/NS) has no BE home in the register contract —
      // see required_adminpanel_change.md. We send the BE-supported fields only.
      payment: {
        brand: payment.brand,
        holder_name: payment.holder_name,
        exp_month: payment.exp_month,
        exp_year: payment.exp_year,
        token: payment.token,
      },
    };

    setSubmitting(true);
    try {
      await registerStore({ data: payload });
      // The new STORE user is auto-signed-in (cookies set server-side).
      signIn();
      toast.success(t("auth.registrationSubmitted"));
      navigate({ to: "/register/status" });
    } catch (err) {
      toast.error(parseServerError(err).message || t("auth.fixStepErrors"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
          {t("auth.backToSignIn")}
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_280px]">
          <Card className="rounded-3xl border-0 bg-card p-8 shadow-elevated">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t("auth.regStepOf", { n: step + 1, total: STEPS.length })} · {STEPS[step].label}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
              {t("auth.regTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("auth.regSubtitle")}</p>

            {/* Stepper */}
            <ol className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
              {STEPS.map((s, i) => (
                <li key={s.key} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => i < step && setStep(i)}
                    className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition ${
                      i < step
                        ? "bg-primary text-primary-foreground"
                        : i === step
                          ? "bg-gradient-primary text-primary-foreground shadow-glow"
                          : "bg-muted text-muted-foreground"
                    }`}
                    aria-label={t("auth.gotoStep", { label: s.label })}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </button>
                  <span
                    className={`text-sm ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className={`mx-1 h-px w-6 ${i < step ? "bg-primary" : "bg-border"}`} />
                  )}
                </li>
              ))}
            </ol>

            {/* Step bodies — each is its own form to isolate validation */}
            <div className="mt-8">
              {step === 0 && <AccountStep form={accountForm} />}
              {step === 1 && <ShopStep form={shopForm} />}
              {step === 2 && <AddressStep form={addressForm} />}
              {step === 3 && <IdentityStep form={identityForm} />}
              {step === 4 && <PaymentStep form={paymentForm} />}
            </div>

            {/* Nav */}
            <div className="mt-10 flex items-center justify-between border-t pt-6">
              <Button
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft className="me-1.5 h-4 w-4" /> {t("auth.back")}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  className="bg-gradient-primary text-primary-foreground shadow-glow"
                  onClick={next}
                >
                  {t("auth.continue")} <ChevronRight className="ms-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="bg-gradient-primary text-primary-foreground shadow-glow"
                  onClick={submitAll}
                  disabled={submitting}
                >
                  <ShieldCheck className="me-1.5 h-4 w-4" /> {t("auth.submitRegistration")}
                </Button>
              )}
            </div>
          </Card>

          {/* Summary rail */}
          <aside className="hidden lg:block">
            <Card className="sticky top-6 rounded-3xl border-0 bg-card p-6 shadow-soft">
              <h2 className="font-display text-base font-semibold">{t("auth.progressTitle")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("auth.progressHint")}</p>
              <ul className="mt-4 space-y-2.5">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const done = i < step;
                  const current = i === step;
                  return (
                    <li
                      key={s.key}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-sm transition ${
                        current ? "border-primary/40 bg-primary/5" : done ? "bg-muted/30" : ""
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full ${
                          done
                            ? "bg-primary text-primary-foreground"
                            : current
                              ? "bg-gradient-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className={current ? "font-semibold" : ""}>{s.label}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                {t("auth.progressHelp")}{" "}
                <a className="underline-offset-2 hover:underline" href="#">
                  {t("auth.talkToSupport")}
                </a>
              </p>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Account ──────────────────────────────────────────── */

function AccountStep({ form }: { form: UseFormReturn<AccountValues> }) {
  const t = useT();
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;
  const [otpOpen, setOtpOpen] = useState(false);
  const verified = !!watch("verification_ticket");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={t("auth.firstName")} required error={errors.first_name?.message}>
        <Input dir="ltr" {...register("first_name")} />
      </Field>
      <Field label={t("auth.lastName")} required error={errors.last_name?.message}>
        <Input dir="ltr" {...register("last_name")} />
      </Field>
      <Field label={t("auth.email")} required error={errors.email?.message}>
        <Input dir="ltr" type="email" placeholder="you@store.com" {...register("email")} />
      </Field>
      <Field
        label={t("auth.phone")}
        required
        error={errors.phone?.message ?? (!verified ? t("auth.verifyPhoneFirst") : undefined)}
      >
        <div className="flex gap-2">
          <Input
            dir="ltr"
            type="tel"
            placeholder="+961 70 000 000"
            disabled={verified}
            className="flex-1"
            {...register("phone")}
          />
          {verified ? (
            <Badge className="gap-1 border border-success/30 bg-success/15 text-success">
              <Check className="h-3 w-3" /> {t("auth.verified")}
            </Badge>
          ) : (
            <Button
              variant="outline"
              type="button"
              onClick={async () => {
                const ok = await form.trigger("phone");
                if (!ok) return;
                try {
                  // POST /api/admin/v1/stores/send_code/
                  await sendPhoneCode({ data: { phone: watch("phone") } });
                  toast.success(t("auth.codeSentToast"));
                  setOtpOpen(true);
                } catch (err) {
                  toast.error(parseServerError(err).message || t("auth.fixStepErrors"));
                }
              }}
            >
              {t("auth.sendCode")}
            </Button>
          )}
        </div>
      </Field>
      <Field label={t("auth.password")} required error={errors.password?.message}>
        <Input
          dir="ltr"
          type="password"
          placeholder={t("auth.passwordHint")}
          {...register("password")}
        />
        <p className="mt-1 text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
      </Field>
      <Field
        label={t("auth.confirmPassword")}
        required
        error={
          errors.password_confirm?.message === "passwordsMismatch"
            ? t("auth.passwordsMismatch")
            : errors.password_confirm?.message
        }
      >
        <Input dir="ltr" type="password" {...register("password_confirm")} />
      </Field>

      {otpOpen && (
        <OtpModal
          phone={watch("phone")}
          onClose={() => setOtpOpen(false)}
          onVerified={(ticket) => {
            // verify_phone returns a verification_ticket stored in wizard state.
            setValue("verification_ticket", ticket, { shouldValidate: true });
            toast.success(t("auth.phoneVerifiedToast"));
            setOtpOpen(false);
          }}
        />
      )}
    </div>
  );
}

function OtpModal({
  phone,
  onClose,
  onVerified,
}: {
  phone: string;
  onClose: () => void;
  onVerified: (verificationTicket: string) => void;
}) {
  const t = useT();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(30);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function doVerify() {
    setVerifying(true);
    try {
      // POST /api/admin/v1/stores/verify_phone/ → { verification_ticket }
      const res = await verifyPhone({ data: { phone, code } });
      onVerified(res.verification_ticket);
    } catch (err) {
      toast.error(parseServerError(err).message || t("auth.fixStepErrors"));
    } finally {
      setVerifying(false);
    }
  }

  async function doResend() {
    try {
      await sendPhoneCode({ data: { phone } });
      setCooldown(30);
      toast.success(t("auth.codeSentToast"));
    } catch (err) {
      toast.error(parseServerError(err).message || t("auth.fixStepErrors"));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-sm rounded-2xl border-0 bg-card p-6 shadow-elevated">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{t("auth.verifyPhoneTitle")}</h3>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label={t("common.cancel")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.verifyPhoneDesc")}</p>
        <div className="mt-5 flex justify-center" dir="ltr">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="mt-5 w-full bg-gradient-primary text-primary-foreground shadow-glow"
          disabled={code.length < 6 || verifying}
          onClick={doVerify}
        >
          {t("auth.verify")}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t("auth.didntGetIt")}{" "}
          <button
            type="button"
            disabled={cooldown > 0}
            onClick={doResend}
            className="underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60"
          >
            {cooldown > 0 ? t("auth.resendIn", { n: cooldown }) : t("auth.resend")}
          </button>
        </p>
      </Card>
    </div>
  );
}

/* ─── Step 2: Shop ─────────────────────────────────────────────── */

function ShopStep({ form }: { form: UseFormReturn<ShopValues> }) {
  const t = useT();
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={t("auth.shopNameEn")} required error={errors.name_en?.message}>
        <Input placeholder="Beirut Pantry" {...register("name_en")} />
      </Field>
      <Field label={t("auth.shopNameAr")} required error={errors.name_ar?.message}>
        <Input dir="rtl" placeholder="بيروت بانتري" {...register("name_ar")} />
      </Field>
      <Field label={t("auth.defaultLanguage")} required error={errors.default_language?.message}>
        <Select
          value={watch("default_language")}
          onValueChange={(v) => setValue("default_language", v as "en" | "ar")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t("auth.english")}</SelectItem>
            <SelectItem value="ar">{t("auth.arabic")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("auth.category")} error={errors.category_id?.message}>
        <Select
          value={watch("category_id") || undefined}
          onValueChange={(v) => setValue("category_id", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("auth.chooseCategory")} />
          </SelectTrigger>
          <SelectContent>
            {[
              { id: "cat_pantry", name: "Pantry" },
              { id: "cat_spices", name: "Spices" },
              { id: "cat_sweets", name: "Sweets" },
              { id: "cat_beverages", name: "Beverages" },
              { id: "cat_bakery", name: "Bakery" },
            ].map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("auth.aboutEn")} className="sm:col-span-2">
        <Textarea rows={3} {...register("about_en")} />
      </Field>
      <Field label={t("auth.aboutAr")} className="sm:col-span-2">
        <Textarea rows={3} dir="rtl" {...register("about_ar")} />
      </Field>
      <Field label={t("auth.featuresEn")}>
        <Textarea rows={2} {...register("features_en")} />
      </Field>
      <Field label={t("auth.featuresAr")}>
        <Textarea rows={2} dir="rtl" {...register("features_ar")} />
      </Field>
      <Field label={t("auth.targetAudienceEn")}>
        <Textarea rows={2} {...register("target_audience_en")} />
      </Field>
      <Field label={t("auth.targetAudienceAr")}>
        <Textarea rows={2} dir="rtl" {...register("target_audience_ar")} />
      </Field>
      <Field label={t("auth.sellingPromotionsEn")}>
        <Textarea rows={2} {...register("selling_promotions_en")} />
      </Field>
      <Field label={t("auth.sellingPromotionsAr")}>
        <Textarea rows={2} dir="rtl" {...register("selling_promotions_ar")} />
      </Field>
    </div>
  );
}

/* ─── Step 3: Address ──────────────────────────────────────────── */

function AddressStep({ form }: { form: UseFormReturn<AddressValues> }) {
  const t = useT();
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;
  const [mapOpen, setMapOpen] = useState(false);
  const lat = watch("latitude");
  const lng = watch("longitude");
  const hasPin = !!lat && !!lng;

  // location_id cascade is region-scoped server-side; ids are demo placeholders.
  const LOCATIONS = [
    { id: "loc_beirut", label: "Lebanon · Beirut · Hamra" },
    { id: "loc_tripoli", label: "Lebanon · Tripoli · Mina" },
    { id: "loc_riyadh", label: "Saudi Arabia · Riyadh · Olaya" },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        label={t("auth.country") + " / " + t("auth.city") + " / " + t("auth.area")}
        required
        className="sm:col-span-2"
        error={errors.location_id?.message}
      >
        <Select
          value={watch("location_id") || undefined}
          onValueChange={(v) => setValue("location_id", v, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("auth.chooseCity")} />
          </SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t("auth.recipientName")} required error={errors.recipient_name?.message}>
        <Input {...register("recipient_name")} />
      </Field>
      <Field label={t("auth.phoneNumber")} required error={errors.phone_number?.message}>
        <Input dir="ltr" type="tel" {...register("phone_number")} />
      </Field>
      <Field label={t("auth.governorate")} required error={errors.governorate?.message}>
        <Input {...register("governorate")} />
      </Field>
      <Field label={t("auth.area")} error={errors.area?.message}>
        <Input {...register("area")} />
      </Field>
      <Field label={t("auth.postcode")} error={errors.postcode?.message}>
        <Input dir="ltr" className="font-mono" {...register("postcode")} />
      </Field>
      <Field label={t("auth.street")} required error={errors.street?.message}>
        <Input {...register("street")} />
      </Field>
      <Field label={t("auth.building")} required error={errors.building?.message}>
        <Input dir="ltr" type="number" min={0} className="font-mono" {...register("building")} />
      </Field>
      <Field label={t("auth.floor")} required error={errors.floor?.message}>
        <Input dir="ltr" type="number" min={0} className="font-mono" {...register("floor")} />
      </Field>
      <Field label={t("auth.apartment")} required error={errors.apartment?.message}>
        <Input dir="ltr" type="number" min={0} className="font-mono" {...register("apartment")} />
      </Field>

      <Field
        label={t("auth.pinOnMap")}
        required
        className="sm:col-span-2"
        error={errors.latitude?.message ?? errors.longitude?.message}
      >
        <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-4">
          {hasPin ? (
            <MapPinned className="h-5 w-5 text-success" />
          ) : (
            <MapPin className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {hasPin ? `${t("auth.pinSet")} · ${lat}, ${lng}` : t("auth.noPinYet")}
            </p>
            <p className="text-xs text-muted-foreground">{t("auth.pinHint")}</p>
          </div>
          <Button variant="outline" type="button" onClick={() => setMapOpen(true)}>
            {t("auth.pickOnMap")}
          </Button>
        </div>
      </Field>
      <Field label={t("auth.note")} className="sm:col-span-2">
        <Textarea rows={2} placeholder={t("auth.notePlaceholder")} {...register("note")} />
      </Field>

      {mapOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-lg rounded-2xl border-0 bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{t("auth.pickMapTitle")}</h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setMapOpen(false)}
                aria-label={t("common.cancel")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.pickMapDesc")}</p>
            <div className="mt-4 grid h-48 place-items-center rounded-xl border border-dashed bg-muted/30 text-muted-foreground">
              <MapPin className="h-8 w-8" />
            </div>
            <Button
              className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={() => {
                // Demo coordinates (Beirut). Real picker captures the dropped pin.
                setValue("latitude", "33.8938", { shouldValidate: true });
                setValue("longitude", "35.5018", { shouldValidate: true });
                setMapOpen(false);
              }}
            >
              {t("auth.usePin")}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─── Step 4: Identity ─────────────────────────────────────────── */

function IdentityStep({ form }: { form: UseFormReturn<IdentityValues> }) {
  const t = useT();
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;
  const accountType = watch("account_type");
  const front = watch("identity_front_side");
  const back = watch("identity_back_side");
  const docs = watch("supporting_documents");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={t("auth.accountType")} required className="sm:col-span-2">
        <RadioGroup
          value={accountType}
          onValueChange={(v) =>
            setValue("account_type", v as "INDIVIDUAL" | "COMPANY", { shouldValidate: true })
          }
          className="grid grid-cols-2 gap-3"
        >
          {[
            { v: "INDIVIDUAL", label: t("auth.individualSeller"), desc: t("auth.individualDesc") },
            { v: "COMPANY", label: t("auth.registeredCompany"), desc: t("auth.companyDesc") },
          ].map((o) => (
            <label
              key={o.v}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${accountType === o.v ? "border-primary/40 bg-primary/5" : ""}`}
            >
              <RadioGroupItem value={o.v} />
              <div>
                <p className="font-medium">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </Field>

      <Field label={t("auth.identityNumber")} required error={errors.identity?.message}>
        <Input dir="ltr" className="font-mono" {...register("identity")} />
      </Field>
      <Field label={t("auth.countryOfIssue")} required error={errors.country_of_issue?.message}>
        <Input
          dir="ltr"
          placeholder="LB"
          maxLength={3}
          className="font-mono uppercase"
          {...register("country_of_issue")}
        />
      </Field>
      <Field label={t("auth.firstName")} required error={errors.first_name?.message}>
        <Input {...register("first_name")} />
      </Field>
      <Field label={t("auth.middleName")} error={errors.middle_name?.message}>
        <Input {...register("middle_name")} />
      </Field>
      <Field label={t("auth.lastName")} required error={errors.last_name?.message}>
        <Input {...register("last_name")} />
      </Field>
      <Field
        label={t("auth.dob")}
        required
        error={errors.dob?.message === "mustBe18" ? t("auth.mustBe18") : errors.dob?.message}
      >
        <Input dir="ltr" type="date" {...register("dob")} />
      </Field>
      <Field
        label={t("auth.expirationDate")}
        required
        error={
          errors.expiration_date?.message === "mustBeFuture"
            ? t("auth.mustBeFuture")
            : errors.expiration_date?.message
        }
      >
        <Input dir="ltr" type="date" {...register("expiration_date")} />
      </Field>

      {accountType === "COMPANY" && (
        <>
          <Field label={t("auth.businessName")} required error={errors.business_name?.message}>
            <Input {...register("business_name")} />
          </Field>
          <Field
            label={t("auth.businessLicenseNumber")}
            required
            error={errors.business_license_number?.message}
          >
            <Input dir="ltr" className="font-mono" {...register("business_license_number")} />
          </Field>
        </>
      )}

      <Field
        label={t("auth.residentialAddress")}
        required
        className="sm:col-span-2"
        error={errors.residential_address?.message}
      >
        <Textarea rows={2} {...register("residential_address")} />
      </Field>

      <Field
        label={t("auth.idFront")}
        required
        error={
          errors.identity_front_side?.message === "fileRequired"
            ? t("auth.fileRequired")
            : (errors.identity_front_side as { message?: string } | undefined)?.message
        }
      >
        <FileDrop
          value={front}
          onPick={(a) => setValue("identity_front_side", a, { shouldValidate: true })}
          onClear={() => setValue("identity_front_side", null, { shouldValidate: true })}
        />
      </Field>
      <Field
        label={t("auth.idBack")}
        required
        error={
          errors.identity_back_side?.message === "fileRequired"
            ? t("auth.fileRequired")
            : (errors.identity_back_side as { message?: string } | undefined)?.message
        }
      >
        <FileDrop
          value={back}
          onPick={(a) => setValue("identity_back_side", a, { shouldValidate: true })}
          onClear={() => setValue("identity_back_side", null, { shouldValidate: true })}
        />
      </Field>
      <Field label={t("auth.supportingDocs")} className="sm:col-span-2">
        <FileDrop
          multiple
          values={docs}
          onAdd={(a) =>
            setValue("supporting_documents", [...docs, ...a].slice(0, 10), { shouldValidate: true })
          }
          onRemoveAt={(i) =>
            setValue(
              "supporting_documents",
              docs.filter((_, idx) => idx !== i),
              { shouldValidate: true },
            )
          }
        />
      </Field>
    </div>
  );
}

/** Upload one file to register_document/ and resolve to an asset reference. */
async function uploadAsset(file: File): Promise<AssetRef> {
  const form = new FormData();
  form.append("file", file);
  const res = await uploadRegisterDocument({ data: form });
  return { asset_id: res.asset_id, name: file.name };
}

function FileDrop(
  props:
    | {
        multiple?: false;
        value: AssetRef | null;
        onPick: (a: AssetRef) => void;
        onClear: () => void;
        values?: never;
        onAdd?: never;
        onRemoveAt?: never;
      }
    | {
        multiple: true;
        values: AssetRef[];
        onAdd: (a: AssetRef[]) => void;
        onRemoveAt: (i: number) => void;
        value?: never;
        onPick?: never;
        onClear?: never;
      },
) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const multiple = !!props.multiple;
  const [uploading, setUploading] = useState(false);

  function thumb() {
    return (
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <FileIcon className="h-4 w-4" />
      </div>
    );
  }

  if (!multiple && props.value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-background/40 p-3">
        {thumb()}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{props.value.name}</p>
          <p className="text-xs text-success">{t("auth.uploaded")}</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>
          {t("auth.replace")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={props.onClear}
        >
          {t("auth.remove")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setUploading(true);
            try {
              props.onPick(await uploadAsset(f));
            } catch (err) {
              toast.error(parseServerError(err).message || t("auth.uploadHint"));
            } finally {
              setUploading(false);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 p-6 text-center transition hover:bg-muted/40">
        <Upload className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-medium">
          {multiple ? t("auth.uploadMulti") : t("auth.uploadClick")}
        </p>
        <p className="text-xs text-muted-foreground">{t("auth.uploadHint")}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple={multiple}
          className="hidden"
          disabled={uploading}
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (!files.length) return;
            setUploading(true);
            try {
              if (multiple) {
                const assets = await Promise.all(files.map(uploadAsset));
                props.onAdd!(assets);
              } else {
                props.onPick!(await uploadAsset(files[0]));
              }
            } catch (err) {
              toast.error(parseServerError(err).message || t("auth.uploadHint"));
            } finally {
              setUploading(false);
            }
          }}
        />
      </label>
      {multiple && props.values!.length > 0 && (
        <ul className="space-y-2">
          {props.values!.map((d, i) => (
            <li
              key={d.asset_id}
              className="flex items-center gap-3 rounded-xl border bg-background/40 p-3"
            >
              {thumb()}
              <p className="min-w-0 flex-1 truncate text-sm">{d.name}</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => props.onRemoveAt!(i)}
              >
                {t("auth.remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Step 5: Payment ──────────────────────────────────────────── */

function PaymentStep({ form }: { form: UseFormReturn<PaymentValues> }) {
  const t = useT();
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;
  const tokenized = !!watch("token");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={t("auth.type")} required error={errors.type?.message}>
        <Select
          value={watch("type")}
          onValueChange={(v) => setValue("type", v as PaymentValues["type"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CC">{t("auth.typeCC")}</SelectItem>
            <SelectItem value="COD">{t("auth.typeCOD")}</SelectItem>
            <SelectItem value="QR">{t("auth.typeQR")}</SelectItem>
            <SelectItem value="NS">{t("auth.typeNS")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("auth.brand")} required error={errors.brand?.message}>
        <Select
          value={watch("brand")}
          onValueChange={(v) => setValue("brand", v as PaymentValues["brand"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Visa">{t("auth.brandVisa")}</SelectItem>
            <SelectItem value="Mastercard">{t("auth.brandMastercard")}</SelectItem>
            <SelectItem value="Other">{t("auth.brandOther")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field
        label={t("auth.holderName")}
        required
        className="sm:col-span-2"
        error={errors.holder_name?.message}
      >
        <Input className="uppercase" placeholder="KARIM HADDAD" {...register("holder_name")} />
      </Field>
      <Field
        label={t("auth.cardTokenized")}
        required
        className="sm:col-span-2"
        error={errors.token?.message}
      >
        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="font-mono text-muted-foreground" dir="ltr">
            {tokenized ? "•••• •••• •••• 4242" : "•••• •••• •••• ••••"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("auth.tokenizeHint")}</p>
          <div className="mt-3">
            {tokenized ? (
              <Badge className="gap-1 border border-success/30 bg-success/15 text-success">
                <Check className="h-3 w-3" /> {t("auth.cardTokenized2")}
              </Badge>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setValue("token", `tok_demo_${Date.now()}`, { shouldValidate: true })
                }
              >
                {t("auth.tokenizeCard")}
              </Button>
            )}
          </div>
        </div>
      </Field>
      <Field label={t("auth.expMonth")} required error={errors.exp_month?.message}>
        <Input
          dir="ltr"
          type="number"
          min={1}
          max={12}
          className="font-mono"
          placeholder="MM"
          {...register("exp_month")}
        />
      </Field>
      <Field label={t("auth.expYear")} required error={errors.exp_year?.message}>
        <Input
          dir="ltr"
          type="number"
          min={new Date().getFullYear()}
          className="font-mono"
          placeholder="YYYY"
          {...register("exp_year")}
        />
      </Field>
      <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:col-span-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 text-success" />
        <p className="text-muted-foreground">{t("auth.paymentNote")}</p>
      </div>
    </div>
  );
}

/* ─── shared field wrapper ─────────────────────────────────────── */

function Field({
  label,
  required,
  children,
  className,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  error?: string;
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
