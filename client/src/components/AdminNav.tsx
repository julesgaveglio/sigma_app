import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FileText, HeadphonesIcon, LogOut, Search, Coins, GitBranch, CalendarDays, Bell, CheckCheck, X, Filter, Users, Euro, TrendingUp, MessageSquarePlus, ShieldCheck, Building2, Home, Menu, Gem, Star } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Etat Civil",
    icon: FileText,
    match: (path: string) => path === "/dashboard" || (path.startsWith("/dashboard") && !path.startsWith("/dashboard/mandats") && !path.startsWith("/dashboard/hexa") && !path.startsWith("/dashboard/pipeline") && !path.startsWith("/dashboard/courtage") && !path.startsWith("/dashboard/recherche-bien") && !path.startsWith("/dashboard/calendar") && !path.startsWith("/dashboard/customcare") && !path.startsWith("/dashboard/sigma-credit") && !path.startsWith("/dashboard/reseau") && !path.startsWith("/dashboard/commissions") && !path.startsWith("/dashboard/sales") && !path.startsWith("/dashboard/feedbacks") && !path.startsWith("/dashboard/admin") && !path.startsWith("/dashboard/avis-pipe") && !path.startsWith("/dashboard/off-market") && !path.startsWith("/dashboard/courtiers") && !path.startsWith("/dashboard/portail") && !path.startsWith("/dashboard/courtier") && !path.startsWith("/dashboard/matching")),
  },
  {
    href: "/dashboard/customcare",
    label: "Custom Care",
    icon: HeadphonesIcon,
    match: (path: string) => path.startsWith("/dashboard/customcare") || path.startsWith("/customcare"),
  },
  {
    href: "/dashboard/mandats",
    label: "Mandats",
    icon: Search,
    match: (path: string) => path.startsWith("/dashboard/mandats"),
  },
  {
    href: "/dashboard/sigma-credit",
    label: "Sigma Credit",
    icon: Coins,
    match: (path: string) => path.startsWith("/dashboard/sigma-credit"),
  },
  {
    href: "/dashboard/pipeline",
    label: "Pipeline",
    icon: GitBranch,
    match: (path: string) => path.startsWith("/dashboard/pipeline"),
  },
  {
    href: "/dashboard/courtage",
    label: "Courtage",
    icon: Building2,
    match: (path: string) => path.startsWith("/dashboard/courtage"),
  },
  {
    href: "/dashboard/recherche-bien",
    label: "Recherche",
    icon: Home,
    match: (path: string) => path.startsWith("/dashboard/recherche-bien"),
  },
  {
    href: "/dashboard/calendar",
    label: "Agenda",
    icon: CalendarDays,
    match: (path: string) => path.startsWith("/dashboard/calendar"),
  },
  {
    href: "/dashboard/reseau",
    label: "Reseau",
    icon: Users,
    match: (path: string) => path.startsWith("/dashboard/reseau") || path.startsWith("/ambassadeur"),
  },
  {
    href: "/dashboard/off-market",
    label: "Off Market",
    icon: Gem,
    match: (path: string) => path.startsWith("/dashboard/off-market"),
  },
  {
    href: "/dashboard/commissions",
    label: "Commissions",
    icon: Euro,
    match: (path: string) => path.startsWith("/dashboard/commissions"),
  },
  {
    href: "/dashboard/sales",
    label: "Sales",
    icon: TrendingUp,
    match: (path: string) => path.startsWith("/dashboard/sales") || path.startsWith("/sales"),
  },
  {
    href: "/dashboard/feedbacks",
    label: "Feedbacks",
    icon: MessageSquarePlus,
    match: (path: string) => path.startsWith("/dashboard/feedbacks"),
  },
  {
    href: "/dashboard/avis-pipe",
    label: "Avis",
    icon: Star,
    match: (path: string) => path.startsWith("/dashboard/avis-pipe"),
  },
  {
    href: "/dashboard/admin/whitelist",
    label: "Acces",
    icon: ShieldCheck,
    adminOnly: true,
    match: (path: string) => path.startsWith("/dashboard/admin"),
  },
];

const TYPE_LABELS: Record<string, string> = {
  nouveau_lead: "Nouveau lead",
  changement_etape: "Etape modifiee",
  nouvelle_note: "Nouvelle note",
  nouvelle_tache: "Nouvelle tache",
  rappel_rdv: "Rappel RDV",
};

const MEMBRES = ["Maria", "Manon", "Elodie", "Hanna", "Marie", "Owner"];

function NotificationPanel({ onClose, userMembre }: { onClose: () => void; userMembre: string }) {
  const [filtreMembre, setFiltreMembre] = useState<string>(userMembre);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: notifs = [], isLoading } = trpc.notifications.list.useQuery(undefined, { refetchInterval: 30000 });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  function handleNotifClick(n: any) {
    markRead.mutate({ id: n.id });
    if (n.lien) {
      onClose();
      if (n.lien.startsWith("/")) {
        navigate(n.lien);
      } else {
        window.location.href = n.lien;
      }
    }
  }

  const notifsFiltrees = notifs.filter((n: any) => filtreMembre === "Owner" ? true : n.destinataire === filtreMembre);

  return (
    <div className="absolute right-0 top-full mt-1" style={{
      width: "380px",
      background: "#111111",
      border: "1px solid #1E1E1E",
      borderRadius: "2px",
      zIndex: 50,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid #1E1E1E" }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: "#6B6560", strokeWidth: 1.5 }} />
          <span className="label-uppercase" style={{ color: "#F0EDE6", fontSize: "11px" }}>Notifications</span>
          {notifs.filter((n: any) => !n.lu).length > 0 && (
            <span style={{
              background: "#C9A84C",
              color: "#0A0A0A",
              fontSize: "10px",
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: "2px",
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}>
              {notifs.filter((n: any) => !n.lu).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => markAll.mutate()} className="p-1.5 transition-opacity duration-300 hover:opacity-70" title="Tout marquer comme lu" style={{ color: "#6B6560" }}>
            <CheckCheck className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
          </button>
          <button onClick={onClose} className="p-1.5 transition-opacity duration-300 hover:opacity-70" style={{ color: "#6B6560" }}>
            <X className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
          </button>
        </div>
      </div>

      {/* Filtres membres */}
      <div className="px-5 py-2.5 flex items-center gap-2 flex-wrap" style={{ borderBottom: "1px solid #1E1E1E" }}>
        <Filter className="w-3 h-3 shrink-0" style={{ color: "#3A3632", strokeWidth: 1.5 }} />
        {MEMBRES.map((m) => (
          <button key={m} onClick={() => setFiltreMembre(m)}
            className="transition-colors duration-300"
            style={{
              fontSize: "10px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              padding: "3px 8px",
              borderRadius: "2px",
              background: filtreMembre === m ? "#C9A84C" : "#161616",
              color: filtreMembre === m ? "#0A0A0A" : "#6B6560",
              border: `1px solid ${filtreMembre === m ? "#C9A84C" : "#1E1E1E"}`,
            }}
          >{m}</button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ maxHeight: "360px", overflowY: "auto" }}>
        {isLoading ? (
          <div className="px-5 py-8 text-center" style={{ color: "#3A3632", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif" }}>Chargement...</div>
        ) : notifsFiltrees.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ color: "#3A3632", fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif" }}>Aucune notification</div>
        ) : (
          notifsFiltrees.map((n: any) => (
            <button key={n.id} className="w-full text-left px-5 py-3 transition-colors duration-300"
              style={{
                borderBottom: "1px solid #151515",
                background: !n.lu ? "#0D0D0D" : "transparent",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
              onMouseLeave={e => (e.currentTarget.style.background = !n.lu ? "#0D0D0D" : "transparent")}
              onClick={() => handleNotifClick(n)}
            >
              <div className="flex items-start gap-2.5">
                {!n.lu && <div className="w-1.5 h-1.5 mt-1.5 shrink-0" style={{ background: "#C9A84C", borderRadius: "1px" }} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span style={{ fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#6B6560", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>{TYPE_LABELS[n.type] || n.type}</span>
                    {n.destinataire && (
                      <span style={{ fontSize: "10px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", padding: "1px 5px", background: "#161616", borderRadius: "2px" }}>{n.destinataire}</span>
                    )}
                  </div>
                  <p style={{ fontSize: "13px", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, color: "#F0EDE6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{n.titre}</p>
                  <p style={{ fontSize: "12px", fontFamily: "'Hanken Grotesk', sans-serif", color: "#3A3632", marginTop: "2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{n.message}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
  });

  const userName = user?.name ?? "";
  const MEMBRES_LIST = ["Maria", "Manon", "Elodie", "Hanna", "Marie"];
  const userMembre = MEMBRES_LIST.find(m => userName.toLowerCase().includes(m.toLowerCase())) ?? "Owner";

  const { data: countData } = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 30000 });
  const unreadCount = countData?.count ?? 0;

  const { data: countByPageData } = trpc.notifications.countByPage.useQuery(undefined, { refetchInterval: 30000 });
  const countByPage = countByPageData ?? {};

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const visibleItems = NAV_ITEMS.filter(item => !(item as any).adminOnly || user?.role === "admin" || user?.role === "direction");
  const activeItem = visibleItems.find(item => item.match(location));

  return (
    <div className="sticky top-0 z-40" style={{ background: "#0A0A0A", borderBottom: "1px solid #1E1E1E" }}>
      <div className="flex items-center gap-4 px-5 py-3" style={{ maxWidth: "1440px", margin: "0 auto" }}>

        {/* Wordmark */}
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "14px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "#C9A84C",
          textTransform: "uppercase" as const,
          whiteSpace: "nowrap" as const,
        }}>
          SIGMA
        </span>

        <div style={{ width: "1px", height: "16px", background: "#1E1E1E" }} />

        {/* Page active */}
        {activeItem && (
          <div className="flex items-center gap-2" style={{ color: "#F0EDE6" }}>
            <activeItem.icon className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
            <span style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
            }}>
              {activeItem.label}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Notifications */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            onClick={() => { setShowNotifs(v => !v); setShowMenu(false); }}
            className="relative flex items-center justify-center w-8 h-8 transition-opacity duration-300 hover:opacity-70"
            title="Notifications"
            style={{ color: "#6B6560" }}
          >
            <Bell className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: "0",
                right: "0",
                background: "#C9A84C",
                color: "#0A0A0A",
                fontSize: "9px",
                fontWeight: 700,
                fontFamily: "'Hanken Grotesk', sans-serif",
                width: "14px",
                height: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "2px",
              }}>
                {unreadCount > 9 ? "+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} userMembre={userMembre} />}
        </div>

        {/* User */}
        {user && (
          <span style={{
            color: "#3A3632",
            fontSize: "11px",
            fontFamily: "'Hanken Grotesk', sans-serif",
            letterSpacing: "0.02em",
            maxWidth: "120px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap" as const,
          }} className="hidden md:block">
            {user.name ?? user.email}
          </span>
        )}

        {/* Menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => { setShowMenu(v => !v); setShowNotifs(false); }}
            className="flex items-center gap-2 px-3 py-1.5 transition-colors duration-300"
            title="Navigation"
            style={{
              color: "#6B6560",
              border: "1px solid #1E1E1E",
              borderRadius: "2px",
              background: "transparent",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
          >
            <Menu className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
            <span className="hidden sm:block" style={{
              fontSize: "11px",
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
            }}>Menu</span>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1" style={{
              width: "240px",
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "2px",
              zIndex: 50,
              overflow: "hidden",
              padding: "4px 0",
            }}>
              {visibleItems.map((item) => {
                const active = item.match(location);
                const notifCount = countByPage[item.href] ?? 0;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-2 transition-colors duration-300"
                    style={{
                      fontSize: "12px",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontWeight: active ? 500 : 400,
                      letterSpacing: "0.02em",
                      color: active ? "#C9A84C" : "#6B6560",
                      background: active ? "#161616" : "transparent",
                      textDecoration: "none",
                      borderLeft: active ? "2px solid #C9A84C" : "2px solid transparent",
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#F0EDE6"; e.currentTarget.style.background = "#161616"; }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "#6B6560"; e.currentTarget.style.background = "transparent"; }}}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" style={{ strokeWidth: 1.5 }} />
                    <span className="flex-1">{item.label}</span>
                    {notifCount > 0 && (
                      <span style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        padding: "1px 5px",
                        borderRadius: "2px",
                        background: active ? "#C9A84C" : "#1E1E1E",
                        color: active ? "#0A0A0A" : "#6B6560",
                      }}>
                        {notifCount > 9 ? "9+" : notifCount}
                      </span>
                    )}
                  </a>
                );
              })}
              <div style={{ borderTop: "1px solid #1E1E1E", marginTop: "4px", paddingTop: "4px" }}>
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="flex items-center gap-3 px-4 py-2 w-full text-left transition-colors duration-300"
                  style={{
                    fontSize: "12px",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    color: "#3A3632",
                    background: "transparent",
                    border: "none",
                    borderLeft: "2px solid transparent",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#A04040"; e.currentTarget.style.background = "#161616"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#3A3632"; e.currentTarget.style.background = "transparent"; }}
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" style={{ strokeWidth: 1.5 }} />
                  <span>Deconnexion</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
