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

  if (submitted) {
    const dateStr = selectedDay
      ? new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : "";
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-[#C9A84C]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white mb-2">Point Immobilier confirmé !</h1>
            <p className="text-[#C9A84C] font-semibold text-sm tracking-widest uppercase">Sigma Factory — Pôle Immobilier</p>
          </div>
          <div className="bg-[#111] border border-[#C9A84C]/30 p-5 text-left space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white text-sm">{dateStr}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white text-sm">{selectedHeure} — Point Immobilier (45 min)</span>
            </div>
            <div className="flex items-center gap-3">
              <Home className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white text-sm">Avec Élodie — Conseillère Immobilière</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Élodie vous contactera à l'heure convenue. Un email de confirmation vous a été envoyé à <strong className="text-white">{form.email}</strong>.
          </p>
          <a href="/" className="inline-block text-[#C9A84C] text-sm hover:underline">← Retour à l'accueil</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-[#C9A84C]/20 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-[4px] text-[#C9A84C] uppercase mb-1">Sigma Factory</div>
            <h1 className="text-xl font-black text-white">Point Immobilier</h1>
            <p className="text-gray-400 text-sm mt-0.5">Premier échange avec Élodie pour lancer votre recherche de bien — 45 min</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 px-4 py-2">
            <Home className="w-4 h-4 text-[#C9A84C]" />
            <span className="text-[#C9A84C] text-sm font-semibold">Pôle Immo</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Bandeau info */}
        <div className="bg-[#111] border-l-2 border-[#C9A84C] px-5 py-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            Ce rendez-vous marque votre entrée dans le <strong className="text-white">Pôle Immobilier Sigma Factory</strong>. 
            Élodie, votre conseillère dédiée, fera le point sur votre projet, votre enveloppe de financement et lancera la recherche du bien idéal.
          </p>
        </div>

        {/* Étape 1 : Calendrier */}
        {step === "date" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black mb-1">Choisissez votre créneau</h2>
              <p className="text-gray-400 text-sm">Disponibilités d'Élodie : Lun–Mar–Jeu–Ven–Sam 10h–19h · Mer 17h–19h</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Calendrier */}
              <div className="bg-[#111] border border-gray-800 p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} disabled={isCurrentMonthPast} className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white font-bold text-sm">{MOIS[calMonth]} {calYear}</span>
                  <button onClick={nextMonth} className="text-gray-400 hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {JOURS.map(j => (
                    <div key={j} className="text-center text-gray-600 text-xs font-bold py-1">{j}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
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
                        className={`aspect-square text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-[#C9A84C] text-black"
                            : avail
                              ? "text-white hover:bg-[#C9A84C]/20 hover:text-[#C9A84C]"
                              : "text-gray-700 cursor-not-allowed"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Créneaux horaires */}
              <div className="bg-[#111] border border-gray-800 p-4">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Créneaux disponibles</p>
                <p className="text-[#C9A84C]/60 text-xs mb-3 flex items-center gap-1">
                  <span>🕐</span> Horaires en heure de Paris (UTC+2)
                </p>
                {selectedDay ? (
                  <>
                    <p className="text-[#C9A84C] text-sm font-semibold mb-3">
                      {new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    {getAvailableSlotsFiltered(calYear, calMonth, selectedDay).length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {getAvailableSlotsFiltered(calYear, calMonth, selectedDay).map(h => (
                          <button
                            key={h}
                            onClick={() => setSelectedHeure(h)}
                            className={`py-3 text-sm font-mono font-bold border transition-all ${
                              selectedHeure === h
                                ? "border-[#C9A84C] bg-[#C9A84C] text-black"
                                : "border-gray-700 text-white hover:border-[#C9A84C]/50"
                            }`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-600 text-sm py-4">Aucun créneau disponible ce jour.</div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-sm py-8">
                    Sélectionnez une date
                  </div>
                )}
              </div>
            </div>

            <Button
              disabled={!selectedDay || !selectedHeure}
              onClick={() => setStep("info")}
              className="bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold px-8"
            >
              Continuer →
            </Button>
          </div>
        )}

        {/* Étape 2 : Informations */}
        {step === "info" && (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep("date")} className="text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black">Vos coordonnées</h2>
                <p className="text-gray-400 text-sm">
                  Point Immobilier · {selectedDay && new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à {selectedHeure}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Prénom *</Label>
                <Input value={form.prenom} onChange={set("prenom")} required className="bg-[#111] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Nom *</Label>
                <Input value={form.nom} onChange={set("nom")} required className="bg-[#111] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Email *</Label>
                <Input type="email" value={form.email} onChange={set("email")} required className="bg-[#111] border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Téléphone *</Label>
                <Input value={form.telephone} onChange={set("telephone")} required className="bg-[#111] border-gray-700 text-white" />
              </div>
              <div className="col-span-2">
                <Label className="text-gray-400 text-xs mb-1 block">Votre projet (optionnel)</Label>
                <textarea
                  value={form.message}
                  onChange={set("message")}
                  rows={3}
                  placeholder="Décrivez brièvement votre projet immobilier (type de bien, localisation souhaitée, budget estimé...)..."
                  className="w-full bg-[#111] border border-gray-700 text-white text-sm px-3 py-2 resize-none focus:outline-none focus:border-[#C9A84C]/50"
                />
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="bg-[#111] border border-[#C9A84C]/20 p-5 space-y-2">
              <p className="text-[#C9A84C] text-xs font-bold uppercase tracking-widest mb-3">Récapitulatif</p>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-white">
                  {selectedDay && new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-white">{selectedHeure} — Point Immobilier (45 min)</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Home className="w-4 h-4 text-gray-500" />
                <span className="text-white">Avec Élodie — Pôle Immobilier Sigma Factory</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={bookRdv.isPending}
              className="w-full bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold py-4 text-base"
            >
              {bookRdv.isPending ? "Confirmation en cours..." : "Confirmer mon Point Immobilier"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
