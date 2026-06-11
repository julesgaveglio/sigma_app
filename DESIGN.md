# Sigma Factory — Design System

> Ce document fige les regles visuelles du CRM Sigma Ecosystem.
> Toute modification d'interface doit respecter ces contraintes.
> Derniere mise a jour : 11/06/2026

---

## 1. Direction artistique

**Plateforme institutionnelle premium** — esprit banque privee suisse,
editorial academique. Pas de look SaaS IA. Chaque ecran doit respirer
le calme, la maitrise et la confiance.

Mots-cles : sobre, epure, typographique, dense en information mais
aere en composition, autoritaire sans etre froid.

---

## 2. Palette de couleurs

| Token | Hex | Usage |
|---|---|---|
| `--background` | `#0A0A0A` | Fond principal (noir profond) |
| `--surface` | `#111111` | Cards, panels, zones sureleves |
| `--surface-raised` | `#161616` | Inputs, zones interactives |
| `--border` | `#1E1E1E` | Separateurs, bordures (1px) |
| `--border-subtle` | `#151515` | Bordures encore plus discretes |
| `--foreground` | `#F0EDE6` | Texte principal (blanc casse chaud) |
| `--foreground-muted` | `#6B6560` | Texte secondaire, labels |
| `--foreground-faint` | `#3A3632` | Texte tertiaire, placeholders |
| `--gold` | `#C9A84C` | Accent dore — **usage rare** |
| `--gold-muted` | `#8A7535` | Or desature pour etats disabled |
| `--destructive` | `#A04040` | Erreurs, actions dangereuses |
| `--success` | `#4A7A5A` | Confirmations, statuts positifs |

### Regle de l'or

**Un seul element dore par ecran au maximum.** L'or est reserve au CTA
principal ou a un separateur/accent unique. Tout le reste est en blanc,
gris ou noir. Jamais de gradient dore.

---

## 3. Typographie

| Role | Police | Poids | Usage |
|---|---|---|---|
| Display / Titres | Cormorant Garamond | 400, 600, 700 | h1, h2, h3, KPIs, wordmark |
| Body / UI | Hanken Grotesk | 300, 400, 500, 600 | Corps de texte, labels, boutons, nav |
| Donnees | Hanken Grotesk | 500 tabular-nums | Tableaux, montants, pourcentages, dates |

### Regles typographiques

- **h1** : Cormorant, 700, tracking +0.08em, uppercase
- **h2** : Cormorant, 600, tracking +0.04em
- **h3** : Cormorant, 400, tracking +0.02em
- **Body** : Hanken Grotesk, 400, 14px base, line-height 1.6
- **Labels** : Hanken Grotesk, 500, 11px, uppercase, tracking +0.08em, `foreground-muted`
- **KPIs / Chiffres** : Cormorant, 600, font-variant-numeric: tabular-nums
- **Tableaux** : Hanken Grotesk, 400, tabular-nums obligatoire

---

## 4. Espacement et layout

- **Radius** : 2px par defaut, 4px maximum. Jamais au-dessus.
- **Separateurs** : 1px solid `--border`, jamais de box-shadow
- **Espace negatif** : genereux. Minimum 24px entre les sections, 48px entre les blocs majeurs.
- **Grille** : alignement rigoureux, pas de placement approximatif
- **Max-width container** : 1280px centre

---

## 5. Composants

### Boutons

- **Primaire** : fond `--gold`, texte `#0A0A0A`, font Hanken 500, uppercase, tracking +0.1em, 11px, radius 2px, padding 14px 28px
- **Secondaire** : fond transparent, bordure 1px `--border`, texte `--foreground`, meme typo
- **Ghost** : fond transparent, pas de bordure, texte `--foreground-muted`
- **Disabled** : fond `--gold-muted`, cursor not-allowed
- **Hover primaire** : luminosite +10%, pas de scale/bounce

### Inputs

- Fond `--surface-raised`
- Bordure 1px `--border`
- Radius 2px
- Padding 12px 14px
- Texte `--foreground`, placeholder `--foreground-faint`
- Focus : bordure `--gold`, pas de glow/ring
- Transition border-color 300ms ease

### Cards / Panels

- Fond `--surface`
- Bordure 1px `--border`
- Radius 2px
- Padding 32px
- Pas d'ombre portee

### Tables

- Header : Hanken 500, 11px, uppercase, tracking, `--foreground-muted`
- Rows : bordure bottom 1px `--border-subtle`
- Cellules numeriques : tabular-nums, alignees a droite
- Hover row : fond `--surface-raised`

---

## 6. Motion

- **Duree** : 300-400ms
- **Easing** : ease ou cubic-bezier(0.25, 0.1, 0.25, 1)
- **Transitions** : opacity + transform uniquement
- **Entrees** : fade-in + translateY(8px) → (0)
- **Interdits** : bounce, spring, overshoot, scale > 1.02
- **Page transitions** : opacity fade 300ms, pas de slide

---

## 7. Icones (Lucide)

- Stroke width : 1.5
- Taille par defaut : 16px (inline), 20px (nav), 24px (hero)
- Couleur : `currentColor` (herite du texte parent)
- Jamais de couleur appliquee directement sur une icone
- Jamais de fond colore derriere une icone

---

## 8. Graphiques (Recharts)

- Couleur serie principale : `--gold`
- Series secondaires : `#4A4A4A`, `#3A3A3A`, `#2A2A2A`
- Fond grille : transparent
- Axes : `--foreground-faint`
- Labels : Hanken Grotesk 11px
- Tooltip : fond `--surface`, bordure 1px `--border`

---

## 9. Interdits absolus

- Gradients de couleur (lineaires ou radiaux)
- Box-shadow / ombres portees
- Border-radius > 4px
- Emojis dans l'interface (sauf notifications internes)
- Icones colorees individuellement
- Animations bounce, spring, ou elastic
- Fonds blancs (#fff)
- Police Inter, Roboto, Arial, ou system-ui en visible
