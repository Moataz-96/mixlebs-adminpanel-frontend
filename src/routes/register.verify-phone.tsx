import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Phone, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useT } from "@/lib/i18n";
import { sendPhoneCode, verifyPhone as verifyPhoneApi } from "@/lib/api/stores.functions";
import { parseServerError } from "@/lib/api/error";

export const Route = createFileRoute("/register/verify-phone")({
  head: () => ({ meta: [{ title: "Verify phone — Mixlebs Admin" }] }),
  // Optional ?phone= so this standalone screen can drive the OTP endpoints.
  validateSearch: (s: Record<string, unknown>) => ({
    phone: typeof s.phone === "string" ? s.phone : "",
  }),
  component: VerifyPhone,
});

function VerifyPhone() {
  const t = useT();
  const navigate = useNavigate();
  const { phone } = Route.useSearch();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(30);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function verify() {
    setVerifying(true);
    try {
      // POST /api/admin/v1/stores/verify_phone/ → { verification_ticket }. The
      // ticket is handed back to the wizard via the ?ticket= search param.
      const res = await verifyPhoneApi({ data: { phone, code } });
      toast.success(t("auth.vpVerifiedToast"));
      navigate({ to: "/register", search: { ticket: res.verification_ticket } as never });
    } catch (err) {
      toast.error(parseServerError(err).message || t("auth.vpVerifiedToast"));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-surface p-6">
      <Card className="w-full max-w-md border-0 bg-card p-8 shadow-soft">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Phone className="h-7 w-7" />
        </div>
        <h1 className="text-center font-display text-2xl font-bold">{t("auth.vpTitle")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("auth.vpDesc", { phone: "+961 70 *** 456" })}
        </p>

        <div className="mt-8 flex justify-center" dir="ltr">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          className="mt-6 w-full bg-gradient-primary text-primary-foreground shadow-glow"
          disabled={code.length < 6 || verifying}
          onClick={verify}
        >
          {t("auth.vpVerify")}
        </Button>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link
            to="/register"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("auth.vpChangeNumber")}
          </Link>
          <button
            type="button"
            disabled={cooldown > 0}
            onClick={async () => {
              try {
                // POST /api/admin/v1/stores/send_code/
                await sendPhoneCode({ data: { phone } });
                setCooldown(30);
                toast.success(t("auth.codeSentToast"));
              } catch (err) {
                toast.error(parseServerError(err).message || t("auth.codeSentToast"));
              }
            }}
            className="text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {cooldown > 0 ? t("auth.resendIn", { n: cooldown }) : t("auth.resend")}
          </button>
        </div>
      </Card>
    </div>
  );
}
