import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Search,
  Moon,
  Sun,
  Languages,
  Check,
  ChevronsUpDown,
  LayoutDashboard,
  ShoppingCart,
  Package,
  UserRound,
  Store as StoreIcon,
  Ticket,
  PlusCircle,
  LogOut,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useApp, type Role } from "@/lib/app-context";
import { usePermissions } from "@/components/shared/Can";
import { useT } from "@/lib/i18n";
import { NOTIFICATIONS } from "@/lib/mock-data";

export function AppTopbar() {
  const {
    role,
    setRole,
    theme,
    setTheme,
    locale,
    setLocale,
    currentStoreId,
    setCurrentStoreId,
    stores,
    signOut,
  } = useApp();
  const t = useT();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const [openNotif, setOpenNotif] = useState(false);
  const [openPalette, setOpenPalette] = useState(false);
  const unread = NOTIFICATIONS.filter((n) => !n.read).length;
  const currentStore = stores.find((s) => s.id === currentStoreId);

  // ⌘K / Ctrl-K global toggle.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenPalette((o) => !o);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = (fn: () => void) => {
    setOpenPalette(false);
    fn();
  };

  const go = (url: string) => run(() => navigate({ to: url as never }));
  const handleSignOut = () => {
    signOut();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-xl">
      <SidebarTrigger className="shrink-0" />

      <div className="relative ms-1 hidden flex-1 max-w-xl md:block">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          readOnly
          onClick={() => setOpenPalette(true)}
          onFocus={() => setOpenPalette(true)}
          placeholder={t("nav.topbar.searchPlaceholder")}
          className="h-9 ps-9 cursor-pointer bg-muted/50 border-transparent focus-visible:bg-background"
        />
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        {role !== "store" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2" data-store-picker-trigger>
                <span className="grid h-5 w-5 place-items-center rounded bg-gradient-primary text-[10px] font-semibold text-primary-foreground">
                  {currentStore?.logo ?? "··"}
                </span>
                <span className="hidden max-w-[140px] truncate sm:inline">
                  {currentStore?.name ?? t("nav.topbar.allStores")}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>{t("nav.topbar.actingOnStore")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setCurrentStoreId(null)}>
                <Check
                  className={`me-2 h-4 w-4 ${currentStoreId === null ? "opacity-100" : "opacity-0"}`}
                />
                {t("nav.topbar.allStores")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {stores.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => setCurrentStoreId(s.id)}>
                  <Check
                    className={`me-2 h-4 w-4 ${currentStoreId === s.id ? "opacity-100" : "opacity-0"}`}
                  />
                  <span className="grid h-5 w-5 place-items-center rounded bg-muted text-[10px] font-semibold me-2">
                    {s.logo}
                  </span>
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-1.5">
              <Badge
                variant="outline"
                className="border-primary/40 bg-primary/10 text-primary uppercase tracking-wider"
              >
                {role}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("nav.topbar.switchRole")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as Role)}>
              <DropdownMenuRadioItem value="admin">
                {t("nav.topbar.roleAdmin")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="staff">
                {t("nav.topbar.roleStaff")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="store">
                {t("nav.topbar.roleStore")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          aria-label={t("nav.topbar.toggleLanguage")}
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">{locale.toUpperCase()}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={t("nav.topbar.toggleTheme")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu open={openNotif} onOpenChange={setOpenNotif}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              aria-label={t("nav.topbar.notifications")}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>{t("nav.topbar.notifications")}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {t("nav.topbar.newCount", { n: unread })}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {NOTIFICATIONS.slice(0, 5).map((n) => (
              <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5 py-2">
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium">{n.title}</span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-1">{n.body}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  {n.at}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 ps-1.5 pe-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                  KA
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">Karim A.</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>karim@mixlebs.com</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/account">{t("nav.items.Profile")}</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/account/change-password">{t("nav.items.Change password")}</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/account/preferences">{t("nav.items.Preferences")}</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>{t("nav.topbar.signOut")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandDialog open={openPalette} onOpenChange={setOpenPalette}>
        <CommandInput placeholder={t("nav.palette.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("nav.palette.empty")}</CommandEmpty>

          <CommandGroup heading={t("nav.palette.navigate")}>
            {has("dashboard.view_own") && (
              <CommandItem onSelect={() => go("/dashboard")}>
                <LayoutDashboard /> {t("nav.palette.goDashboard")}
              </CommandItem>
            )}
            {has("orders.view") && (
              <CommandItem onSelect={() => go("/orders")}>
                <ShoppingCart /> {t("nav.palette.goOrders")}
              </CommandItem>
            )}
            {has("products.view") && (
              <CommandItem onSelect={() => go("/products")}>
                <Package /> {t("nav.palette.goProducts")}
              </CommandItem>
            )}
            {has("customers.view") && (
              <CommandItem onSelect={() => go("/customers")}>
                <UserRound /> {t("nav.palette.goCustomers")}
              </CommandItem>
            )}
            {has("stores.view") && (
              <CommandItem onSelect={() => go("/stores")}>
                <StoreIcon /> {t("nav.palette.goStores")}
              </CommandItem>
            )}
            {has("coupons.view") && (
              <CommandItem onSelect={() => go("/coupons")}>
                <Ticket /> {t("nav.palette.goCoupons")}
              </CommandItem>
            )}
          </CommandGroup>

          <CommandGroup heading={t("nav.palette.actions")}>
            {has("products.create") && (
              <CommandItem onSelect={() => go("/products/new")}>
                <PlusCircle /> {t("nav.palette.createProduct")}
              </CommandItem>
            )}
            {has("coupons.create") && (
              <CommandItem onSelect={() => go("/coupons/new")}>
                <PlusCircle /> {t("nav.palette.createCoupon")}
              </CommandItem>
            )}
            {has("orders.view") && (
              <CommandItem onSelect={() => go("/orders")}>
                <Search /> {t("nav.palette.findOrder")}
              </CommandItem>
            )}
            {has("customers.view") && (
              <CommandItem onSelect={() => go("/customers")}>
                <Search /> {t("nav.palette.findCustomer")}
              </CommandItem>
            )}
            {has("products.view") && (
              <CommandItem onSelect={() => go("/products")}>
                <Search /> {t("nav.palette.findProduct")}
              </CommandItem>
            )}
            {has("stores.view") && (
              <CommandItem onSelect={() => go("/stores")}>
                <Search /> {t("nav.palette.findStore")}
              </CommandItem>
            )}
          </CommandGroup>

          <CommandGroup heading={t("nav.palette.prefs")}>
            {role !== "store" && (
              <CommandItem
                onSelect={() =>
                  run(() =>
                    document
                      .querySelector<HTMLButtonElement>("[data-store-picker-trigger]")
                      ?.click(),
                  )
                }
              >
                <StoreIcon /> {t("nav.palette.switchStore")}
              </CommandItem>
            )}
            <CommandItem onSelect={() => run(() => setTheme(theme === "dark" ? "light" : "dark"))}>
              {theme === "dark" ? <Sun /> : <Moon />} {t("nav.palette.switchTheme")}
            </CommandItem>
            <CommandItem onSelect={() => run(() => setLocale(locale === "en" ? "ar" : "en"))}>
              <Languages /> {t("nav.palette.switchLocale")}
            </CommandItem>
            <CommandItem onSelect={() => run(handleSignOut)}>
              <LogOut /> {t("nav.palette.signOut")}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
