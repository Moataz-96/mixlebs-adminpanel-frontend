import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  // Orders
  PENDING: "bg-warning/15 text-warning border-warning/30",
  READY: "bg-info/15 text-info border-info/30",
  SHIPPED: "bg-info/15 text-info border-info/30",
  DELIVERED: "bg-success/15 text-success border-success/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  DECLINED: "bg-destructive/15 text-destructive border-destructive/30",
  DELIVERY_ISSUE: "bg-destructive/15 text-destructive border-destructive/30",
  // Products
  AVAILABLE: "bg-success/15 text-success border-success/30",
  HIDDEN: "bg-muted text-muted-foreground border-border",
  ARCHIVED: "bg-destructive/15 text-destructive border-destructive/30",
  // Stores
  Verified: "bg-success/15 text-success border-success/30",
  Pending: "bg-warning/15 text-warning border-warning/30",
  Unverified: "bg-muted text-muted-foreground border-border",
  Blocked: "bg-destructive/15 text-destructive border-destructive/30",
  // Payment
  PAID: "bg-success/15 text-success border-success/30",
  REFUNDED: "bg-info/15 text-info border-info/30",
  // Returns
  CHECKING: "bg-warning/15 text-warning border-warning/30",
  APPROVED: "bg-success/15 text-success border-success/30",
  RETURNED: "bg-info/15 text-info border-info/30",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/30",
  // Coupons
  ACTIVE: "bg-success/15 text-success border-success/30",
  SCHEDULED: "bg-info/15 text-info border-info/30",
  EXPIRED: "bg-muted text-muted-foreground border-border",
  // Misc
  OPEN: "bg-warning/15 text-warning border-warning/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
  RESOLVED: "bg-success/15 text-success border-success/30",
  ISSUED: "bg-info/15 text-info border-info/30",
  PUBLISHED: "bg-success/15 text-success border-success/30",
  DRAFT: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[10px] uppercase tracking-wider",
        MAP[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
