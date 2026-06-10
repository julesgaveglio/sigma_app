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

  if (submitted) {
    const [h] = (selectedHeure ?? "").split(":");
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
            <h1 className="text-2xl font-black text-white mb-2">Rendez-vous confirmé !</h1>
            <p className="text-[#C9A84C] font-semibold text-sm tracking-widest uppercase">SIGMA FACTORY</p>
          </div>
          <div className="bg-[#111] border border-[#C9A84C]/30 p-5 text-left space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white text-sm">{dateStr}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white text-sm">{selectedHeure} — {selectedType?.label} ({selectedType?.duree})</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Maria vous contactera à l'heure convenue. Un email de confirmation vous a été envoyé à <strong className="text-white">{form.email}</strong>.
          </p>
          <a href="/" className="inline-block text-[#C9A84C] text-sm hover:underline">← Retour à l'accueil</a>
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#C9A84C]/20 py-5 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-widest">SIGMA <span className="text-[#C9A84C]">FACTORY</span></h1>
            <p className="text-xs text-gray-500 tracking-widest mt-0.5">CONSEIL EN IMMOBILIER & FINANCEMENT</p>
          </div>
          <div className="text-right">
            <div className="text-[#C9A84C] font-bold text-sm">PRISE DE RENDEZ-VOUS</div>
            <div className="text-gray-500 text-xs">avec Maria</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Étape 1 : Choix du type */}
        {step === "type" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black mb-2">Choisissez votre rendez-vous</h2>
              <p className="text-gray-400">Sélectionnez le type d'échange avec Maria.</p>
            </div>
            <div className="grid gap-4">
              {TYPE_RDV.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTypeRdv(t.id as "welcome_call" | "point_personnalise"); setStep("date"); }}
                    className={`w-full text-left border p-6 transition-all ${
                      typeRdv === t.id
                        ? "border-[#C9A84C] bg-[#C9A84C]/5"
                        : "border-gray-800 bg-[#111] hover:border-[#C9A84C]/50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-[#C9A84C]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white text-lg">{t.label}</span>
                          <span className="text-[#C9A84C] text-sm font-mono">{t.duree}</span>
                        </div>
                        <p className="text-gray-400 text-sm">{t.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape 2 : Choix de la date et heure */}
        {step === "date" && (
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              {!presetType && (
                <button onClick={() => setStep("type")} className="text-gray-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-2xl font-black">Choisissez une date</h2>
                <p className="text-[#C9A84C] text-sm font-semibold">{selectedType?.label} · {selectedType?.duree}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Calendrier */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} className="p-2 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-white">{MOIS[calMonth]} {calYear}</span>
                  <button onClick={nextMonth} className="p-2 text-gray-400 hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["L", "M", "M", "J", "V", "S", "D"].map((j, i) => (
                    <div key={i} className="text-center text-xs text-gray-500 py-1">{j}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
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
                        className={`aspect-square text-sm font-medium transition-all ${
                          disabled
                            ? "text-gray-700 cursor-not-allowed"
                            : selected
                            ? "bg-[#C9A84C] text-black font-bold"
                            : "text-white hover:bg-[#C9A84C]/20"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Créneaux horaires */}
              <div>
                <p className="text-[#C9A84C]/60 text-xs mb-3 flex items-center gap-1">
                  <span>🕐</span> Tous les horaires sont en heure de Paris (UTC+2)
                </p>
                {selectedDay ? (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      {new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    {typeRdv && getAvailableSlotsFiltered(typeRdv, calYear, calMonth, selectedDay).length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {getAvailableSlotsFiltered(typeRdv, calYear, calMonth, selectedDay).map((h: string) => (
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
                  <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                    Sélectionnez une date pour voir les créneaux
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

        {/* Étape 3 : Informations */}
        {step === "info" && (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep("date")} className="text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black">Vos coordonnées</h2>
                <p className="text-gray-400 text-sm">
                  {selectedType?.label} · {selectedDay && new Date(calYear, calMonth, selectedDay).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à {selectedHeure}
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
                <Label className="text-gray-400 text-xs mb-1 block">Message (optionnel)</Label>
                <textarea
                  value={form.message}
                  onChange={set("message")}
                  rows={3}
                  placeholder="Décrivez brièvement votre projet ou vos questions..."
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
                <span className="text-white">{selectedHeure} — {selectedType?.label} ({selectedType?.duree})</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={bookRdv.isPending}
              className="w-full bg-[#C9A84C] hover:bg-[#b8943e] text-black font-bold py-4 text-base"
            >
              {bookRdv.isPending ? "Confirmation en cours..." : "Confirmer mon rendez-vous"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
