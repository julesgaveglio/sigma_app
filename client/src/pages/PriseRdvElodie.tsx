import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Clock, CheckCircle, Home, ChevronLeft, ChevronRight } from "lucide-react";

// Disponibilités d'Elodie :
// Lundi, Mardi, Jeudi, Vendredi, Samedi : 10h–19h
// Mercredi : 17h–19h
// Dimanche : off
// dayOfWeek : 0=dim, 1=lun, 2=mar, 3=mer, 4=jeu, 5=ven, 6=sam
const ELODIE_SCHEDULE: { day: number; startH: number; endH: number }[] = [
  { day: 1, startH: 10, endH: 19 }, // Lundi
  { day: 2, startH: 10, endH: 19 }, // Mardi
  { day: 3, startH: 17, endH: 19 }, // Mercredi (17h-19h seulement)
  { day: 4, startH: 10, endH: 19 }, // Jeudi
  { day: 5, startH: 10, endH: 19 }, // Vendredi
  { day: 6, startH: 10, endH: 19 }, // Samedi
];

const ALL_HEURES = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

function getAvailableSlots(year: number, month: number, day: number): string[] {
  const dow = new Date(year, month, day).getDay();
  const match = ELODIE_SCHEDULE.find(s => s.day === dow);
  if (!match) return [];
  return ALL_HEURES.filter(h => {
    const hour = parseInt(h.split(":")[0]);
    return hour >= match.startH && hour < match.endH;
  });
}

function isAvailableDay(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return ELODIE_SCHEDULE.some(s => s.day === dow);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isPast(year: number, month: number, day: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(year, month, day) < today;
}

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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

export default function PriseRdvElodie() {
  const today = new Date();
  const [step, setStep] = useState<"date" | "info">("date");
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedHeure, setSelectedHeure] = useState<string | null>(null);
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", telephone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const { data: blockedSlots } = trpc.calendar.getBlockedSlotsPublic.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // Créneaux déjà réservés pour le jour sélectionné (anti-doublon)
  const selectedDateStr = selectedDay
    ? `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : "";
  const { data: bookedHours = [] } = trpc.calendar.getBookedSlotsByDate.useQuery(
    { date: selectedDateStr, assigneA: "Elodie" },
    { enabled: !!selectedDay, staleTime: 30 * 1000 } // refresh toutes les 30s
  );

  function getAvailableSlotsFiltered(year: number, month: number, day: number): string[] {
    const slots = getAvailableSlots(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // Filtrer les créneaux manuellement bloqués
    const blockedHeures = blockedSlots
      ? (blockedSlots as any[]).filter(b => b.date === dateStr && b.heure && (b.typeRdv === "point_immobilier" || b.typeRdv === "tous")).map(b => b.heure as string)
      : [];
    // Filtrer les créneaux déjà réservés (RDV existants)
    const alreadyBooked = dateStr === selectedDateStr ? (bookedHours as string[]) : [];
    return slots.filter(h => !blockedHeures.includes(h) && !alreadyBooked.includes(h));
  }

  function isDayBlocked(year: number, month: number, day: number): boolean {
    if (!blockedSlots) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return (blockedSlots as any[]).some(b => b.date === dateStr && !b.heure);
  }

  const bookRdv = trpc.calendar.bookRdv.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => toast.error(err.message),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Construit une date UTC correspondant à l'heure Paris choisie,
  // indépendamment du fuseau du navigateur du lead.
  function toParisUTC(year: number, month: number, day: number, h: number, m: number): Date {
    const pad = (n: number) => String(n).padStart(2, "0");
    const isoLocal = `${year}-${pad(month + 1)}-${pad(day)}T${pad(h)}:${pad(m)}:00`;
    const tempUtc = new Date(`${isoLocal}Z`);
    const parisStr = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).format(tempUtc);
    const [datePart, timePart] = parisStr.split(" ");
    const [dd, mm, yyyy] = datePart.split("/");
    const [hh, mi, ss] = timePart.split(":");
    const parisAsUtc = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`);
    const offsetMs = parisAsUtc.getTime() - tempUtc.getTime();
    return new Date(tempUtc.getTime() - offsetMs);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !selectedHeure) return;
    const [h, m] = selectedHeure.split(":").map(Number);
    const dateDebut = toParisUTC(calYear, calMonth, selectedDay, h, m);
    const dateFin = new Date(dateDebut.getTime() + 45 * 60 * 1000); // 45 min
    bookRdv.mutate({
      typeRdv: "point_immobilier",
      nom: form.nom,
      prenom: form.prenom,
      email: form.email,
      telephone: form.telephone,
      message: form.message || undefined,
      dateDebut: dateDebut.toISOString(),
      dateFin: dateFin.toISOString(),
    });
  };

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

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

  const isCurrentMonthPast = calYear < today.getFullYear() || (calYear === today.getFullYear() && calMonth < today.getMonth());

  /* ── Confirmation screen ── */
  if (submitted) {
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
            Point Immobilier confirme
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
            Sigma Factory — Pole Immobilier
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
              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#F0EDE6" }}>
                {dateStr}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <Clock size={16} style={{ color: "#3A3632" }} />
              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#F0EDE6" }}>
                {selectedHeure} — Point Immobilier (45 min)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Home size={16} style={{ color: "#3A3632" }} />
              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#F0EDE6" }}>
                Avec Elodie — Conseillere Immobiliere
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
            Elodie vous contactera a l'heure convenue. Un email de confirmation vous a ete envoye a <strong style={{ color: "#F0EDE6" }}>{form.email}</strong>.
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

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A", color: "#F0EDE6" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid #1E1E1E", padding: "20px 24px" }}>
        <div style={{
          maxWidth: "680px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              color: "#6B6560",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              marginBottom: "4px",
            }}>
              Sigma Factory
            </p>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "20px",
              fontWeight: 600,
              color: "#F0EDE6",
              letterSpacing: "0.04em",
              margin: 0,
            }}>
              Point Immobilier
            </h1>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "12px",
              color: "#6B6560",
              marginTop: "4px",
              lineHeight: "1.6",
            }}>
              Premier echange avec Elodie pour lancer votre recherche de bien — 45 min
            </p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "2px",
            padding: "8px 14px",
          }}>
            <Home size={16} style={{ color: "#6B6560" }} />
            <span style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              color: "#6B6560",
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
            }}>
              Pole Immo
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 24px" }}>

        {/* ── Bandeau info ── */}
        <div style={{
          background: "#111111",
          borderLeft: "2px solid #1E1E1E",
          borderRadius: "0 2px 2px 0",
          padding: "16px 20px",
          marginBottom: "32px",
        }}>
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: "13px",
            color: "#6B6560",
            lineHeight: "1.8",
          }}>
            Ce rendez-vous marque votre entree dans le <strong style={{ color: "#F0EDE6" }}>Pole Immobilier Sigma Factory</strong>.
            Elodie, votre conseillere dediee, fera le point sur votre projet, votre enveloppe de financement et lancera la recherche du bien ideal.
          </p>
        </div>

        {/* ── Etape 1 : Calendrier ── */}
        {step === "date" && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "22px",
                fontWeight: 600,
                color: "#F0EDE6",
                letterSpacing: "0.04em",
                marginBottom: "8px",
              }}>
                Choisissez votre creneau
              </h2>
              <p style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: "12px",
                color: "#6B6560",
              }}>
                Disponibilites d'Elodie : Lun-Mar-Jeu-Ven-Sam 10h-19h — Mer 17h-19h
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Calendrier */}
              <div style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                padding: "20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <button
                    onClick={prevMonth}
                    disabled={isCurrentMonthPast}
                    className="transition-opacity duration-300 ease-out hover:opacity-70"
                    style={{
                      background: "none",
                      border: "none",
                      color: isCurrentMonthPast ? "#1E1E1E" : "#6B6560",
                      cursor: isCurrentMonthPast ? "not-allowed" : "pointer",
                      padding: "4px",
                    }}
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
                  {JOURS.map(j => (
                    <div key={j} style={{
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
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1;
                    const avail = isAvailableDay(calYear, calMonth, d) && !isPast(calYear, calMonth, d) && !isDayBlocked(calYear, calMonth, d);
                    const isSelected = selectedDay === d;
                    return (
                      <button
                        key={d}
                        disabled={!avail}
                        onClick={() => { setSelectedDay(d); setSelectedHeure(null); }}
                        className="transition-colors duration-300 ease-out"
                        style={{
                          aspectRatio: "1",
                          fontFamily: "'Hanken Grotesk', sans-serif",
                          fontSize: "12px",
                          fontWeight: isSelected ? 600 : 400,
                          background: isSelected ? "#C9A84C" : "transparent",
                          color: !avail ? "#1E1E1E" : isSelected ? "#0A0A0A" : "#F0EDE6",
                          border: "none",
                          borderRadius: "2px",
                          cursor: !avail ? "not-allowed" : "pointer",
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Creneaux horaires */}
              <div style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "2px",
                padding: "20px",
              }}>
                <p style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#6B6560",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  marginBottom: "4px",
                }}>
                  Creneaux disponibles
                </p>
                <p style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "11px",
                  color: "#3A3632",
                  marginBottom: "16px",
                }}>
                  Horaires en heure de Paris (UTC+2)
                </p>
                {selectedDay ? (
                  <>
                    <p style={{
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontSize: "13px",
                      color: "#6B6560",
                      marginBottom: "12px",
                    }}>
                      {new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    {getAvailableSlotsFiltered(calYear, calMonth, selectedDay).length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {getAvailableSlotsFiltered(calYear, calMonth, selectedDay).map(h => (
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
                    padding: "32px 0",
                  }}>
                    Selectionnez une date
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

        {/* ── Etape 2 : Informations ── */}
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
                  Point Immobilier — {selectedDay && new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} a {selectedHeure}
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
                <label style={labelStyle}>Votre projet (optionnel)</label>
                <textarea
                  value={form.message}
                  onChange={set("message")}
                  rows={3}
                  placeholder="Decrivez brievement votre projet immobilier (type de bien, localisation souhaitee, budget estime...)..."
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
                <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#F0EDE6" }}>
                  {selectedDay && new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <Clock size={16} style={{ color: "#3A3632" }} />
                <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#F0EDE6" }}>
                  {selectedHeure} — Point Immobilier (45 min)
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Home size={16} style={{ color: "#3A3632" }} />
                <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13px", color: "#F0EDE6" }}>
                  Avec Elodie — Pole Immobilier Sigma Factory
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
              {bookRdv.isPending ? "Confirmation en cours..." : "Confirmer mon Point Immobilier"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
