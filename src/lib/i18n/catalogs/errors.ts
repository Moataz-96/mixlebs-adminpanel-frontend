import type { Catalog } from "../messages";

// Standalone error / forbidden / maintenance full-page routes (403, 404, maintenance).
const errors: Catalog = {
  en: {
    errors: {
      forbidden: {
        title: "You don't have access to this section.",
        desc: "Ask an administrator to grant the missing permission, or switch to an account that has it.",
        missing: "Missing permission:",
        goDashboard: "Go to dashboard",
        signOut: "Sign out",
      },
      notFound: {
        title: "We couldn't find that.",
        desc: "The page may have moved or never existed.",
        goBack: "Go back",
        goDashboard: "Go to dashboard",
      },
      maintenance: {
        title: "We're upgrading. Be right back.",
        desc: "The admin panel is briefly offline for a planned upgrade.",
        eta: "Estimated time to restore: a few minutes.",
        status: "Mixlebs status",
      },
    },
  },
  ar: {
    errors: {
      forbidden: {
        title: "ليس لديك صلاحية الوصول إلى هذا القسم.",
        desc: "اطلب من المسؤول منحك الإذن المطلوب، أو سجّل الدخول بحساب يملك هذا الإذن.",
        missing: "الإذن المفقود:",
        goDashboard: "الذهاب إلى لوحة التحكم",
        signOut: "تسجيل الخروج",
      },
      notFound: {
        title: "تعذّر العثور على ذلك.",
        desc: "قد تكون الصفحة قد نُقلت أو لم تكن موجودة أصلاً.",
        goBack: "رجوع",
        goDashboard: "الذهاب إلى لوحة التحكم",
      },
      maintenance: {
        title: "نحن نقوم بالترقية. سنعود قريبًا.",
        desc: "لوحة الإدارة غير متاحة مؤقتًا لإجراء ترقية مجدولة.",
        eta: "الوقت المقدّر للعودة: بضع دقائق.",
        status: "حالة Mixlebs",
      },
    },
  },
};

export default errors;
