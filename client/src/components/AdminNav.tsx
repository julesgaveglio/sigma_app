import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FileText, HeadphonesIcon, LogOut, Search, Coins, GitBranch, CalendarDays, Bell, CheckCheck, X, Filter, Users, Euro, TrendingUp, MessageSquarePlus, ShieldCheck, Building2, Home, Menu, Gem, Star } from "lucide-react";

const LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/110243537/dS69FocN6akHjQivURfVvd/sigma-logo-full_c217e268.png";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "État Civil",
    icon: FileText,
    match: (path: string) => path === "/dashboard" || (path.startsWith("/dashboard") && !path.startsWith("/dashboard/mandats") && !path.startsWith("/dashboard/hexa") && !path.startsWith("/dashboard/pipeline") && !path.startsWith("/dashboard/courtage") && !path.startsWith("/dashboard/recherche-bien") && !path.startsWith("/dashboard/calendar") && !path.startsWith("/dashboard/customcare") && !path.startsWith("/dashboard/sigma-credit") && !path.startsWith("/dashboard/reseau") && !path.startsWith("/dashboard/commissions") && !path.startsWith("/dashboard/sales") && !path.startsWith("/dashboard/feedbacks") && !path.startsWith("/dashboard/admin") && !path.startsWith("/dashboard/avis-pipe")),
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
    label: "Sigma Crédit",
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
    label: "Réseau",
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
    label: "Avis & Témoignages",
    icon: Star,
    match: (path: string) => path.startsWith("/dashboard/avis-pipe"),
  },
  {
    href: "/dashboard/admin/whitelist",
    label: "Accès",
    icon: ShieldCheck,
    adminOnly: true,
    match: (path: string) => path.startsWith("/dashboard/admin"),
  },
];

const TYPE_LABELS: Record<string, string> = {
  nouveau_lead: "Nouveau lead",
  changement_etape: "Étape modifiée",
  nouvelle_note: "Nouvelle note",
  nouvelle_tache: "Nouvelle tâche",
  rappel_rdv: "Rappel RDV",
};

const TYPE_COLORS: Record<string, string> = {
  nouveau_lead: "text-emerald-400",
  changement_etape: "text-blue-400",
  nouvelle_note: "text-yellow-400",
  nouvelle_tache: "text-purple-400",
  rappel_rdv: "text-red-400",
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
      // Navigation interne SPA pour éviter les 404 sur rechargement
      if (n.lien.startsWith("/")) {
        navigate(n.lien);
      } else {
        window.location.href = n.lien;
      }
    }
  }

  const notifsFiltrees = notifs.filter((n: any) => filtreMembre === "Owner" ? true : n.destinataire === filtreMembre);

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-[#1a1a1a] border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-sm font-semibold text-white">Notifications</span>
          {notifs.filter((n: any) => !n.lu).length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {notifs.filter((n: any) => !n.lu).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => markAll.mutate()} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Tout marquer comme lu">
            <CheckCheck className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
        <Filter className="w-3 h-3 text-zinc-500 shrink-0" />
        {MEMBRES.map((m) => (
          <button key={m} onClick={() => setFiltreMembre(m)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filtreMembre === m ? "text-black" : "text-zinc-400 hover:text-white bg-zinc-800"}`}
            style={filtreMembre === m ? { background: "linear-gradient(135deg, #C9A84C, #F0D080)" } : {}}
          >{m}</button>
        ))}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-zinc-500 text-sm">Chargement…</div>
        ) : notifsFiltrees.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-500 text-sm">Aucune notification</div>
        ) : (
          notifsFiltrees.map((n: any) => (
            <button key={n.id} className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors ${!n.lu ? "bg-zinc-800/30" : ""}`}
              onClick={() => handleNotifClick(n)}
            >
              <div className="flex items-start gap-2">
                {!n.lu && <div className="w-2 h-2 rounded-full bg-[#C9A84C] mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs font-medium ${TYPE_COLORS[n.type] || "text-zinc-300"}`}>{TYPE_LABELS[n.type] || n.type}</span>
                    {n.destinataire && (
                      <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full">{n.destinataire}</span>
                    )}
                  </div>
                  <p className="text-xs text-white font-medium truncate">{n.titre}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.message}</p>
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

  // Fermer les panneaux en cliquant ailleurs
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
    <div className="border-b border-zinc-800 bg-[#0f0f0f] sticky top-0 z-40">
      <div className="max-w-screen-2xl mx-auto px-4 py-2.5 flex items-center gap-3">

        {/* Logo */}
        <img src={LOGO_FULL} alt="Sigma Factory" className="h-6 object-contain shrink-0" />
        <div className="h-5 w-px bg-zinc-700 shrink-0" />

        {/* Page active (label courant) */}
        {activeItem && (
          <div className="flex items-center gap-1.5 text-sm font-semibold shrink-0" style={{ color: "#C9A84C" }}>
            <activeItem.icon className="w-4 h-4" />
            <span>{activeItem.label}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notifications */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            onClick={() => { setShowNotifs(v => !v); setShowMenu(false); }}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} userMembre={userMembre} />}
        </div>

        {/* Utilisateur connecté */}
        {user && (
          <span className="text-zinc-500 text-xs hidden md:block truncate max-w-[120px] shrink-0">
            {user.name ?? user.email}
          </span>
        )}

        {/* Menu hamburger */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => { setShowMenu(v => !v); setShowNotifs(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm transition-colors"
            title="Navigation"
          >
            <Menu className="w-5 h-5" />
            <span className="hidden sm:block text-xs font-medium">Menu</span>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1a1a] border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
              {visibleItems.map((item) => {
                const active = item.match(location);
                const notifCount = countByPage[item.href] ?? 0;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "text-black"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-800"
                    }`}
                    style={active ? { background: "linear-gradient(135deg, #C9A84C, #F0D080)" } : {}}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {notifCount > 0 && (
                      <span className={`text-[10px] rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-bold ${active ? "bg-black/20 text-black" : "bg-red-500 text-white"}`}>
                        {notifCount > 9 ? "9+" : notifCount}
                      </span>
                    )}
                  </a>
                );
              })}
              <div className="border-t border-zinc-800 mt-1 pt-1">
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
