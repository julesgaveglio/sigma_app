import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Clock, CheckCircle, Phone, Video, ChevronLeft, ChevronRight } from "lucide-react";

const TYPE_RDV = [
  {
    id: "welcome_call",
    label: "Welcome Call",
    description: "Premier échange avec Maria pour découvrir votre projet et les solutions Sigma Factory.",
    duree: "30 min",
    icon: Phone,
  },
  {
    id: "point_personnalise",
    label: "Point Personnalisé",
    description: "Suivi de votre dossier, questions spécifiques ou point d'avancement avec Maria.",
    duree: "45 min",
    icon: Video,
  },
];

// Horaires Maria par type de RDV
// Welcome Call : Lundi 13h-18h, Jeudi 9h-18h
// Point Personnalisé : Mercredi 9h-18h
// dayOfWeek : 0=dim, 1=lun, 2=mar, 3=mer, 4=jeu, 5=ven, 6=sam

const SCHEDULE: Record<RdvType, { day: number; startH: number; endH: number }[]> = {
  welcome_call: [
    { day: 1, startH: 13, endH: 18 }, // Lundi 13h-18h
    { day: 4, startH: 9, endH: 18 },  // Jeudi 9h-18h
  ],
  point_personnalise: [
    { day: 3, startH: 9, endH: 18 },  // Mercredi 9h-18h
  ],
};

const ALL_HEURES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function getAvailableSlots(type: RdvType, year: number, month: number, day: number): string[] {
  const dow = new Date(year, month, day).getDay();
  const slots = SCHEDULE[type];
  const match = slots.find(s => s.day === dow);
  if (!match) return [];
  return ALL_HEURES.filter(h => {
    const hour = parseInt(h.split(":")[0]);
    return hour >= match.startH && hour < match.endH;
  });
}

function isAvailableDay(type: RdvType, year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return SCHEDULE[type].some(s => s.day === dow);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=dim
}

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}

function isPast(year: number, month: number, day: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(year, month, day) < today;
}

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type RdvType = "welcome_call" | "point_personnalise";

interface PriseRdvProps {
  presetType?: RdvType;
}

export function PriseRdvWelcomeCall() {
  return <PriseRdv presetType="welcome_call" />;
}

export function PriseRdvPointPersonnalise() {
  return <PriseRdv presetType="point_personnalise" />;
}

/* ── Shared inline styles ── */
const inputStyle: React.CSSProperties = {
  background: "#161616",
  border: "1px solid #1E1E1E",
  borderRadius: "2px",
  padding: "12px 14px",
  color: "#F0EDE6",
  fontSize: "14px",
  fontFamily: "'Hanken Grotesk', sans-serif",
  width: "100%",
  outline: "none",
  transition: "border-color 300ms ease",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: "11px",
  fontWeight: 500,
  color: "#6B6560",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "8px",
};

export default function PriseRdv({ presetType }: PriseRdvProps) {
  const today = new Date();
  const [step, setStep] = useState<"type" | "date" | "info" | "confirm">(presetType ? "date" : "type");
  const [typeRdv, setTypeRdv] = useState<RdvType | null>(presetType ?? null);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedHeure, setSelectedHeure] = useState<string | null>(null);
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", telephone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  // Récupérer les créneaux bloqués par Maria
  const { data: blockedSlots } = trpc.calendar.getBlockedSlotsPublic.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // Créneaux déjà réservés pour le jour sélectionné (anti-doublon)
  const selectedDateStr = selectedDay
    ? `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : "";
  const { data: bookedHours = [] } = trpc.calendar.getBookedSlotsByDate.useQuery(
    { date: selectedDateStr, assigneA: "Maria" },
    { enabled: !!selectedDay, staleTime: 30 * 1000 } // refresh toutes les 30s
  );

  // Vérifie si un jour entier est bloqué pour le type de RDV
  function isDayBlocked(year: number, month: number, day: number): boolean {
    if (!blockedSlots) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return blockedSlots.some((b: any) => {
      if (b.date !== dateStr) return false;
      if (!b.heure) return true; // Journée entière bloquée
      if (b.typeRdv === typeRdv || b.typeRdv === "tous") return false;
      return false;
    });
  }

  // Filtre les créneaux bloqués pour un jour donné + créneaux déjà réservés
  function getAvailableSlotsFiltered(type: RdvType, year: number, month: number, day: number): string[] {
    const slots = getAvailableSlots(type, year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // Créneaux manuellement bloqués
    const blockedHeures = blockedSlots
      ? blockedSlots.filter((b: any) => b.date === dateStr && b.heure && (b.typeRdv === type || b.typeRdv === "tous")).map((b: any) => b.heure as string)
      : [];
    // Créneaux déjà réservés (RDV existants en BDD)
    const alreadyBooked = dateStr === selectedDateStr ? (bookedHours as string[]) : [];
    return slots.filter((h: string) => !blockedHeures.includes(h) && !alreadyBooked.includes(h));
  }

  const bookRdv = trpc.calendar.bookRdv.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const selectedType = TYPE_RDV.find(t => t.id === typeRdv);

  // Construit une date UTC correspondant à l'heure Paris choisie,
  // indépendamment du fuseau du navigateur du lead.
  function toParisUTC(year: number, month: number, day: number, h: number, m: number): Date {
    const pad = (n: number) => String(n).padStart(2, "0");
    // Construire une chaîne ISO en heure Paris et calculer l'offset réel
    const isoLocal = `${year}-${pad(month + 1)}-${pad(day)}T${pad(h)}:${pad(m)}:00`;
    // Utiliser Intl pour obtenir l'offset Paris à cette date précise (gère DST)
    const tempUtc = new Date(`${isoLocal}Z`);
    const parisStr = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).format(tempUtc);
    // parisStr = "20/04/2026 15:00:00" → reconstruire en UTC
    const [datePart, timePart] = parisStr.split(" ");
    const [dd, mm, yyyy] = datePart.split("/");
    const [hh, mi, ss] = timePart.split(":");
    const parisAsUtc = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`);
    // Offset = différence entre l'heure Paris interprétée comme UTC et l'UTC réel
    const offsetMs = parisAsUtc.getTime() - tempUtc.getTime();
    return new Date(tempUtc.getTime() - offsetMs);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeRdv || !selectedDay || !selectedHeure) return;
    const [h, m] = selectedHeure.split(":").map(Number);
    const dateDebut = toParisUTC(calYear, calMonth, selectedDay, h, m);
    const dureeMin = typeRdv === "welcome_call" ? 30 : 45;
    const dateFin = new Date(dateDebut.getTime() + dureeMin * 60 * 1000);

    bookRdv.mutate({
      typeRdv,
      nom: form.nom,
      prenom: form.prenom,
      email: form.email,
      telephone: form.telephone,
      message: form.message || undefined,
      dateDebut: dateDebut.toISOString(),
      dateFin: dateFin.toISOString(),
    });
  };

  /* ── Confirmation screen ── */
  if (submitted) {
    const [h] = (selectedHeure ?? "").split(":");
    const dateStr = selectedDay
      ? new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : "";
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A", padding: "24px" }}>
        <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
          <div style={{
            width: "64px",
            height: "64px",
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <CheckCircle size={28} style={{ color: "#4A7A5A" }} />
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "24px",
            fontWeight: 600,
            color: "#F0EDE6",
            letterSpacing: "0.04em",
            marginBottom: "8px",
          }}>
            Rendez-vous confirme
          </h1>
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "11px",
            fontWeight: 500,
            color: "#6B6560",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            marginBottom: "32px",
          }}>
            Sigma Factory
          </p>

          <div style={{
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "2px",
            padding: "20px 24px",
            textAlign: "left",
            marginBottom: "24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <Calendar size={16} style={{ color: "#3A3632" }} />
              <span style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "13px",
                color: "#F0EDE6",
              }}>
                {dateStr}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Clock size={16} style={{ color: "#3A3632" }} />
              <span style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "13px",
                color: "#F0EDE6",
              }}>
                {selectedHeure} — {selectedType?.label} ({selectedType?.duree})
              </span>
            </div>
          </div>

          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "13px",
            color: "#6B6560",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}>
            Maria vous contactera a l'heure convenue. Un email de confirmation vous a ete envoye a <strong style={{ color: "#F0EDE6" }}>{form.email}</strong>.
          </p>
          <a
            href="/"
            className="transition-opacity duration-300 ease-out hover:opacity-70"
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "12px",
              color: "#6B6560",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            Retour a l'accueil
          </a>
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  // Ajuster pour commencer lundi (0=lun)
  const firstDayAdj = (firstDay + 6) % 7;

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null); setSelectedHeure(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null); setSelectedHeure(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A", color: "#F0EDE6" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid #1E1E1E", padding: "20px 24px" }}>
        <div style={{
          maxWidth: "720px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "#F0EDE6",
              margin: 0,
              textTransform: "uppercase" as const,
            }}>
              Sigma Factory
            </h1>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "10px",
              color: "#3A3632",
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              marginTop: "4px",
            }}>
              Conseil en immobilier & financement
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              color: "#6B6560",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
            }}>
              Prise de rendez-vous
            </div>
            <div style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "12px",
              color: "#3A3632",
              marginTop: "2px",
            }}>
              avec Maria
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px" }}>

        {/* ── Etape 1 : Choix du type ── */}
        {step === "type" && (
          <div>
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "24px",
                fontWeight: 600,
                color: "#F0EDE6",
                letterSpacing: "0.04em",
                marginBottom: "8px",
              }}>
                Choisissez votre rendez-vous
              </h2>
              <p style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "14px",
                color: "#6B6560",
                lineHeight: "1.6",
              }}>
                Selectionnez le type d'echange avec Maria.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {TYPE_RDV.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTypeRdv(t.id as "welcome_call" | "point_personnalise"); setStep("date"); }}
                    className="transition-colors duration-300 ease-out"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "#111111",
                      border: "1px solid #1E1E1E",
                      borderRadius: "2px",
                      padding: "24px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#C9A84C")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E1E")}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                      <div style={{
                        width: "40px",
                        height: "40px",
                        background: "#161616",
                        border: "1px solid #1E1E1E",
                        borderRadius: "2px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Icon size={20} style={{ color: "#6B6560" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: "18px",
                            fontWeight: 600,
                            color: "#F0EDE6",
                            letterSpacing: "0.02em",
                          }}>
                            {t.label}
                          </span>
                          <span style={{
                            fontFamily: "'Hanken Grotesk', sans-serif",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#3A3632",
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {t.duree}
                          </span>
                        </div>
                        <p style={{
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          fontSize: "13px",
                          color: "#6B6560",
                          lineHeight: "1.6",
                        }}>
                          {t.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Etape 2 : Choix de la date et heure ── */}
        {step === "date" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
              {!presetType && (
                <button
                  onClick={() => setStep("type")}
                  className="transition-opacity duration-300 ease-out hover:opacity-70"
                  style={{ background: "none", border: "none", color: "#6B6560", cursor: "pointer", padding: 0 }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div>
                <h2 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "#F0EDE6",
                  letterSpacing: "0.04em",
                }}>
                  Choisissez une date
                </h2>
                <p style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "12px",
                  color: "#6B6560",
                  marginTop: "4px",
                }}>
                  {selectedType?.label} — {selectedType?.duree}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Calendrier */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <button
                    onClick={prevMonth}
                    className="transition-opacity duration-300 ease-out hover:opacity-70"
                    style={{ background: "none", border: "none", color: "#6B6560", cursor: "pointer", padding: "4px" }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#F0EDE6",
                  }}>
                    {MOIS[calMonth]} {calYear}
                  </span>
                  <button
                    onClick={nextMonth}
                    className="transition-opacity duration-300 ease-out hover:opacity-70"
                    style={{ background: "none", border: "none", color: "#6B6560", cursor: "pointer", padding: "4px" }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "8px" }}>
                  {["L", "M", "M", "J", "V", "S", "D"].map((j, i) => (
                    <div key={i} style={{
                      textAlign: "center",
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontSize: "10px",
                      fontWeight: 500,
                      color: "#3A3632",
                      letterSpacing: "0.04em",
                      padding: "4px 0",
                    }}>
                      {j}
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
                  {Array.from({ length: firstDayAdj }).map((_, i) => <div key={`empty-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const weekend = isWeekend(calYear, calMonth, day);
                    const past = isPast(calYear, calMonth, day);
                    const notAvailable = typeRdv ? !isAvailableDay(typeRdv, calYear, calMonth, day) : weekend;
                    const dayBlocked = typeRdv ? isDayBlocked(calYear, calMonth, day) : false;
                    const selected = selectedDay === day;
                    const disabled = past || notAvailable || dayBlocked;
                    return (
                      <button
                        key={day}
                        disabled={disabled}
                        onClick={() => { setSelectedDay(day); setSelectedHeure(null); }}
                        className="transition-colors duration-300 ease-out"
                        style={{
                          aspectRatio: "1",
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          fontSize: "13px",
                          fontWeight: selected ? 600 : 400,
                          background: selected ? "#C9A84C" : "transparent",
                          color: disabled ? "#1E1E1E" : selected ? "#0A0A0A" : "#F0EDE6",
                          border: "none",
                          borderRadius: "2px",
                          cursor: disabled ? "not-allowed" : "pointer",
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Creneaux horaires */}
              <div>
                <p style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "11px",
                  color: "#3A3632",
                  marginBottom: "12px",
                }}>
                  Horaires en heure de Paris (UTC+2)
                </p>
                {selectedDay ? (
                  <>
                    <p style={{
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontSize: "13px",
                      color: "#6B6560",
                      marginBottom: "16px",
                    }}>
                      {new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    {typeRdv && getAvailableSlotsFiltered(typeRdv, calYear, calMonth, selectedDay).length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {getAvailableSlotsFiltered(typeRdv, calYear, calMonth, selectedDay).map((h: string) => (
                          <button
                            key={h}
                            onClick={() => setSelectedHeure(h)}
                            className="transition-colors duration-300 ease-out"
                            style={{
                              padding: "12px",
                              fontFamily: "'Hanken Grotesk', sans-serif",
                              fontSize: "13px",
                              fontWeight: 500,
                              fontVariantNumeric: "tabular-nums",
                              background: selectedHeure === h ? "#C9A84C" : "transparent",
                              color: selectedHeure === h ? "#0A0A0A" : "#F0EDE6",
                              border: selectedHeure === h ? "1px solid #C9A84C" : "1px solid #1E1E1E",
                              borderRadius: "2px",
                              cursor: "pointer",
                            }}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontSize: "13px",
                        color: "#3A3632",
                        padding: "16px 0",
                      }}>
                        Aucun creneau disponible ce jour.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: "13px",
                    color: "#3A3632",
                  }}>
                    Selectionnez une date pour voir les creneaux
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={!selectedDay || !selectedHeure}
              onClick={() => setStep("info")}
              className="transition-opacity duration-300 ease-out"
              style={{
                marginTop: "32px",
                background: (!selectedDay || !selectedHeure) ? "#8A7535" : "#C9A84C",
                color: "#0A0A0A",
                border: "none",
                borderRadius: "2px",
                padding: "14px 28px",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                cursor: (!selectedDay || !selectedHeure) ? "not-allowed" : "pointer",
                opacity: (!selectedDay || !selectedHeure) ? 0.7 : 1,
              }}
            >
              Continuer
            </button>
          </div>
        )}

        {/* ── Etape 3 : Informations ── */}
        {step === "info" && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
              <button
                type="button"
                onClick={() => setStep("date")}
                className="transition-opacity duration-300 ease-out hover:opacity-70"
                style={{ background: "none", border: "none", color: "#6B6560", cursor: "pointer", padding: 0 }}
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h2 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "#F0EDE6",
                  letterSpacing: "0.04em",
                }}>
                  Vos coordonnees
                </h2>
                <p style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "12px",
                  color: "#6B6560",
                  marginTop: "4px",
                }}>
                  {selectedType?.label} — {selectedDay && new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} a {selectedHeure}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
              <div>
                <label style={labelStyle}>Prenom *</label>
                <input
                  value={form.prenom}
                  onChange={set("prenom")}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input
                  value={form.nom}
                  onChange={set("nom")}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
              <div>
                <label style={labelStyle}>Telephone *</label>
                <input
                  value={form.telephone}
                  onChange={set("telephone")}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Message (optionnel)</label>
                <textarea
                  value={form.message}
                  onChange={set("message")}
                  rows={3}
                  placeholder="Decrivez brievement votre projet ou vos questions..."
                  style={{
                    ...inputStyle,
                    resize: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#1E1E1E")}
                />
              </div>
            </div>

            {/* Recapitulatif */}
            <div style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "2px",
              padding: "20px 24px",
              marginBottom: "32px",
            }}>
              <p style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                color: "#6B6560",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                marginBottom: "16px",
              }}>
                Recapitulatif
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <Calendar size={16} style={{ color: "#3A3632" }} />
                <span style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "13px",
                  color: "#F0EDE6",
                }}>
                  {selectedDay && new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Clock size={16} style={{ color: "#3A3632" }} />
                <span style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "13px",
                  color: "#F0EDE6",
                }}>
                  {selectedHeure} — {selectedType?.label} ({selectedType?.duree})
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={bookRdv.isPending}
              className="transition-opacity duration-300 ease-out"
              style={{
                width: "100%",
                background: bookRdv.isPending ? "#8A7535" : "#C9A84C",
                color: "#0A0A0A",
                border: "none",
                borderRadius: "2px",
                padding: "14px",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                cursor: bookRdv.isPending ? "not-allowed" : "pointer",
                opacity: bookRdv.isPending ? 0.7 : 1,
              }}
            >
              {bookRdv.isPending ? "Confirmation en cours..." : "Confirmer mon rendez-vous"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
