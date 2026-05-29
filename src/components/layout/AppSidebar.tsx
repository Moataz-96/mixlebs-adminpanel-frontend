import { useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Tags,
  FolderTree,
  Layers,
  Sparkles,
  ImageIcon,
  ShoppingCart,
  Undo2,
  FileText,
  Ticket,
  Wallet,
  CreditCard,
  Truck,
  Store as StoreIcon,
  Users,
  UserRound,
  Mail,
  Star,
  MessageSquare,
  LifeBuoy,
  Bell,
  HelpCircle,
  FileEdit,
  Megaphone,
  ShieldCheck,
  KeyRound,
  ScrollText,
  Globe,
  Languages,
  Coins,
  MapPin,
  BarChart3,
  Search,
  Settings,
  Sliders,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useApp, can } from "@/lib/app-context";
import { useT } from "@/lib/i18n";

type Item = { title: string; url: string; icon: LucideIcon; perm?: string };
type Group = { label: string; items: Item[] };

const NAV: Group[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, perm: "dashboard.view_own" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", url: "/products", icon: Package, perm: "products.view" },
      { title: "Collections", url: "/collections", icon: Layers, perm: "collections.view" },
      { title: "Categories", url: "/categories", icon: FolderTree, perm: "categories.view" },
      { title: "Properties", url: "/properties", icon: Sliders, perm: "properties.view" },
      {
        title: "Property values",
        url: "/property-values",
        icon: Sparkles,
        perm: "properties.create_value",
      },
      { title: "Tags", url: "/tags", icon: Tags, perm: "tags.view" },
      { title: "Asset library", url: "/assets", icon: ImageIcon, perm: "assets.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Orders", url: "/orders", icon: ShoppingCart, perm: "orders.view" },
      { title: "Returns", url: "/returns", icon: Undo2, perm: "returns.view" },
      { title: "Invoices", url: "/invoices", icon: FileText, perm: "invoices.view" },
    ],
  },
  {
    label: "Promotions & Finance",
    items: [
      { title: "Coupons", url: "/coupons", icon: Ticket, perm: "coupons.view" },
      {
        title: "Payment methods",
        url: "/payment-methods",
        icon: CreditCard,
        perm: "payment_methods.view",
      },
      { title: "Wallet", url: "/wallet", icon: Wallet, perm: "wallet.view_own" },
      { title: "Couriers", url: "/couriers", icon: Truck, perm: "couriers.view" },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Stores", url: "/stores", icon: StoreIcon, perm: "stores.view" },
      { title: "Users", url: "/users", icon: Users, perm: "users.view" },
      { title: "Customers", url: "/customers", icon: UserRound, perm: "customers.view" },
      { title: "Subscribers", url: "/subscribers", icon: Mail, perm: "subscribers.view" },
    ],
  },
  {
    label: "Engagement",
    items: [
      { title: "Product reviews", url: "/reviews/product", icon: Star, perm: "reviews.moderate" },
      { title: "Store reviews", url: "/reviews/store", icon: Star, perm: "reviews.moderate" },
      { title: "Direct messages", url: "/chat", icon: MessageSquare },
      { title: "Support inbox", url: "/support", icon: LifeBuoy, perm: "chat.support_inbox_view" },
      { title: "Notifications", url: "/notifications", icon: Bell, perm: "notifications.view_own" },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "FAQ", url: "/help/faq", icon: HelpCircle, perm: "resources.view" },
      { title: "Articles", url: "/help/articles", icon: FileEdit, perm: "resources.view" },
      { title: "Privacy", url: "/help/privacy", icon: ScrollText, perm: "resources.view" },
      { title: "Terms", url: "/help/terms", icon: ScrollText, perm: "resources.view" },
      {
        title: "Templates",
        url: "/communications/templates",
        icon: Megaphone,
        perm: "templates.view",
      },
      {
        title: "Channels",
        url: "/communications/channels",
        icon: Megaphone,
        perm: "templates.view",
      },
    ],
  },
  {
    label: "RBAC & Admin",
    items: [
      { title: "Roles", url: "/admin/roles", icon: ShieldCheck, perm: "roles.view" },
      {
        title: "Role policies",
        url: "/admin/role-policies",
        icon: ShieldCheck,
        perm: "role_policies.view",
      },
      {
        title: "User policies",
        url: "/admin/user-policies",
        icon: ShieldCheck,
        perm: "user_policies.view",
      },
      { title: "Permissions", url: "/admin/permissions", icon: KeyRound, perm: "permissions.view" },
      {
        title: "Permission resources",
        url: "/admin/permission-resources",
        icon: KeyRound,
        perm: "permission_resources.view",
      },
      { title: "Audit log", url: "/admin/audit-log", icon: ScrollText, perm: "audit_log.view" },
      { title: "App feedback", url: "/admin/feedback", icon: MessageSquare, perm: "feedback.view" },
      {
        title: "Visitors analytics",
        url: "/admin/visitors",
        icon: BarChart3,
        perm: "visitors.view",
      },
      {
        title: "Search history",
        url: "/admin/search-history",
        icon: Search,
        perm: "search_history.view",
      },
      { title: "Options", url: "/admin/options", icon: Sliders, perm: "options.view" },
    ],
  },
  {
    label: "Lookups",
    items: [
      {
        title: "Countries",
        url: "/admin/locations/countries",
        icon: Globe,
        perm: "locations.update",
      },
      { title: "Cities", url: "/admin/locations/cities", icon: MapPin, perm: "locations.update" },
      {
        title: "Currencies",
        url: "/admin/locations/currencies",
        icon: Coins,
        perm: "locations.update",
      },
      {
        title: "Languages",
        url: "/admin/locations/languages",
        icon: Languages,
        perm: "locations.update",
      },
      { title: "Regions", url: "/admin/locations/regions", icon: MapPin, perm: "locations.update" },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Profile", url: "/account", icon: Settings },
      { title: "Change password", url: "/account/change-password", icon: KeyRound },
      { title: "Preferences", url: "/account/preferences", icon: Sliders },
      { title: "Devices", url: "/account/devices", icon: Settings },
      { title: "Sessions", url: "/account/sessions", icon: Settings },
      { title: "Notification prefs", url: "/account/notifications-prefs", icon: Bell },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { role } = useApp();
  const t = useT();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <a href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <span className="font-display text-base font-bold">M</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-bold tracking-tight">Mixlebs</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Admin Panel
              </span>
            </div>
          )}
        </a>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => {
          const visible = group.items.filter((i) => !i.perm || can(role, i.perm));
          if (visible.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              {!collapsed && (
                <SidebarGroupLabel>{t("nav.groups." + group.label)}</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => {
                    const active = pathname === item.url || pathname.startsWith(item.url + "/");
                    const title = t("nav.items." + item.title);
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active} tooltip={title}>
                          <a href={item.url} className="flex items-center gap-2.5">
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span className="truncate">{title}</span>}
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
