import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import FormEtatCivil from "./pages/FormEtatCivil";
import Dashboard from "./pages/Dashboard";
import CustomCareForm from "./pages/CustomCareForm";
import CustomCareDashboard from "./pages/CustomCareDashboard";
import MandatRecherche from "./pages/MandatRecherche";
import MandatDashboard from "./pages/MandatDashboard";
import HexaForm from "./pages/HexaForm";
import HexaDashboard from "./pages/HexaDashboard";
import CrmPipeline from "./pages/CrmPipeline";
import CalendarPage from "./pages/CalendarPage";
import AmbassadeurOnboarding from "./pages/AmbassadeurOnboarding";
import AmbassadeurBienForm from "./pages/AmbassadeurBienForm";
import ReseauDashboard from "./pages/ReseauDashboard";
import CommissionsDashboard from "./pages/CommissionsDashboard";
import Login from "./pages/Login";
import InscriptionCourtier from "./pages/InscriptionCourtier";
import CourtiersDashboard from "./pages/CourtiersDashboard";
import CourtierPortail from "./pages/CourtierPortail";
import PortailMembre from "./pages/PortailMembre";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import PageParrainage from "./pages/PageParrainage";
import PageRejoindre from "./pages/PageRejoindre";
import PortailMembreDemo from "./pages/PortailMembreDemo";
import SalesClose from "./pages/SalesClose";
import FormTableauCourtage from "./pages/FormTableauCourtage";
import SalesDashboard from "./pages/SalesDashboard";
import FeedbacksDashboard from "./pages/FeedbacksDashboard";
import AdminWhitelist from "./pages/AdminWhitelist";
import CourtageBoard from "./pages/CourtageBoard";
import RechercheBienBoard from "./pages/RechercheBienBoard";
import { FeedbackButton } from "./components/FeedbackButton";
import LandingPage from "./pages/LandingPage";
import PriseRdv, { PriseRdvWelcomeCall, PriseRdvPointPersonnalise } from "./pages/PriseRdv";
import PriseRdvElodie from "./pages/PriseRdvElodie";
import MailPreviewPointImmobilier from "./pages/MailPreviewPointImmobilier";
import OffMarketBoard from "./pages/OffMarketBoard";
import AvisPipe from "./pages/AvisPipe";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite";
import MentionsLegales from "./pages/MentionsLegales";

function Router() {
  return (
    <Switch>
      {/* Authentification */}
      <Route path={"/dashboard/avis-pipe"} component={AvisPipe} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/reset-password"} component={ResetPassword} />
      {/* Landing page */}
      <Route path={"/"} component={LandingPage} />
      {/* Formulaires publics */}
      <Route path={"/rdv"}>{() => <PriseRdv />}</Route>
      <Route path={"/rdv/welcome-call"} component={PriseRdvWelcomeCall} />
      <Route path={"/rdv/point-personnalise"} component={PriseRdvPointPersonnalise} />
      <Route path={"/rdv/point-immobilier"} component={PriseRdvElodie} />
      <Route path={"/mail-preview/point-immobilier"} component={MailPreviewPointImmobilier} />
      <Route path={"/etat-civil"} component={FormEtatCivil} />
      <Route path={"/customcare"} component={CustomCareForm} />
      <Route path={"/mandat"} component={MandatRecherche} />
      <Route path={"/hexa"} component={HexaForm} />
      <Route path={"/tableau-courtage"} component={FormTableauCourtage} />
      {/* Dashboards */}
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/dashboard/customcare"} component={CustomCareDashboard} />
      <Route path={"/customcare/dashboard"} component={CustomCareDashboard} />
      <Route path={"/dashboard/mandats"} component={MandatDashboard} />
      <Route path={"/dashboard/hexa"} component={HexaDashboard} />
      <Route path={"/dashboard/pipeline"} component={CrmPipeline} />
      <Route path={"/dashboard/calendar"} component={CalendarPage} />
      <Route path={"/dashboard/sigma-credit"} component={HexaDashboard} />
      {/* Module Ambassadeurs */}
      <Route path={"/ambassadeur"} component={AmbassadeurOnboarding} />
      <Route path={"/ambassadeur/bien"} component={AmbassadeurBienForm} />
      <Route path={"/dashboard/reseau"} component={ReseauDashboard} />
      <Route path={"/dashboard/commissions"} component={CommissionsDashboard} />
      {/* Module Courtiers */}
      <Route path={"/inscription-courtier"} component={InscriptionCourtier} />
      <Route path={"/dashboard/courtiers"} component={CourtiersDashboard} />
      <Route path={"/dashboard/courtier"} component={CourtierPortail} />
      <Route path={"/dashboard/portail"} component={PortailMembre} />
      <Route path={"/portail-membre"} component={PortailMembre} />
      {/* Démo portail membre */}
      <Route path={"/portail-demo"} component={PortailMembreDemo} />
      {/* Module Sales CRM */}
      <Route path={"/sales/close"} component={SalesClose} />
      <Route path={"/dashboard/sales"} component={SalesDashboard} />
      {/* Courtage — Manon */}
      <Route path={"/dashboard/courtage"} component={CourtageBoard} />
      {/* Recherche bien — Élodie */}
      <Route path={"/dashboard/recherche-bien"} component={RechercheBienBoard} />
      {/* Off Market */}
      <Route path={"/dashboard/off-market"} component={OffMarketBoard} />
      {/* Feedbacks */}
      <Route path={"/dashboard/feedbacks"} component={FeedbacksDashboard} />
      {/* Admin */}
      <Route path={"/dashboard/admin/whitelist"} component={AdminWhitelist} />
      {/* Page de parrainage partageable */}
      <Route path={"/parrainage/:code"} component={PageParrainage} />
      <Route path={"/parrainage"} component={PageParrainage} />
      {/* Page rejoindre avec pré-remplissage code parrain */}
      <Route path={"/rejoindre"} component={PageRejoindre} />
      {/* Pages légales */}
      <Route path={"/politique-confidentialite"} component={PolitiqueConfidentialite} />
      <Route path={"/mentions-legales"} component={MentionsLegales} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster theme="dark" position="top-right" />
          <Router />
          <FeedbackButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
