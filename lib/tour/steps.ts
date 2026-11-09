/**
 * Visites guidées : texte statique, aucun appel LLM.
 * `selector` désigne un attribut data-tour (ex. "client-nav-explore").
 * Sans selector (ou si l'élément est masqué, par exemple sur mobile),
 * la bulle s'affiche au centre de l'écran.
 */

export type TourRole = "client" | "manager" | "staff";

export interface TourStep {
  id: string;
  /** Valeur de l'attribut data-tour ciblé ; vide = bulle centrée. */
  selector?: string;
  titre: string;
  texte: string;
  /** Variante pour la page publique (hors connexion) ; sinon `texte`. */
  publicText?: string;
  /** Page à ouvrir avant d'afficher l'étape. */
  route?: string;
}

const CLIENT: TourStep[] = [
  {
    id: "client-bienvenue",
    titre: "Bienvenue sur Restivo",
    texte:
      "Cette visite de quelques étapes vous montre comment réserver une table et précommander vos plats.",
    route: "/mainpage",
  },
  {
    id: "client-recherche",
    publicText:
      "Une fois connecté, une barre de recherche vous permet de trouver un restaurant par son nom ou sa ville.",
    selector: "client-search",
    titre: "Chercher un restaurant",
    texte: "Tapez le nom ou la ville du restaurant que vous cherchez.",
  },
  {
    id: "client-explorer",
    selector: "client-nav-explore",
    titre: "Choisir et réserver",
    texte:
      "Dans Explore, ouvrez un restaurant. Choisissez la date, l'heure et le nombre d'invités, puis une table libre sur le plan. Vous pouvez ensuite ouvrir le menu, choisir vos plats et tout confirmer en une seule fois.",
    route: "/mainpage/explore",
  },
  {
    id: "client-reservations",
    publicText:
      "Dans Reservations, vous retrouvez vos réservations. Vous pouvez les modifier, les annuler, précommander vos repas avec le bouton Pre-order meals, et laisser un avis après votre repas.",
    selector: "client-nav-reservations",
    titre: "Mes réservations",
    texte:
      "Retrouvez ici vos réservations. Vous pouvez les modifier, les annuler, précommander vos repas avec le bouton Pre-order meals, et laisser un avis après votre repas.",
    route: "/mainpage/reservations",
  },
  {
    id: "client-commandes",
    publicText: "Dans Orders, vous suivez l'état de vos précommandes de plats.",
    selector: "client-nav-orders",
    titre: "Mes précommandes",
    texte: "Suivez ici l'état de vos précommandes de plats.",
    route: "/mainpage/orders",
  },
  {
    id: "client-notifications",
    publicText:
      "Une fois connecté, la cloche en haut de l'écran vous prévient quand le restaurant confirme, modifie ou annule votre réservation.",
    selector: "client-bell",
    titre: "Notifications",
    texte:
      "La cloche vous prévient quand le restaurant confirme, modifie ou annule votre réservation.",
  },
  {
    id: "client-aide",
    publicText:
      "Une fois connecté, le bouton d'aide en haut de l'écran relance cette visite guidée à tout moment.",
    selector: "tour-help",
    titre: "Besoin d'aide ?",
    texte: "Ce bouton relance la visite guidée à tout moment.",
  },
];

const MANAGER: TourStep[] = [
  {
    id: "manager-tableau",
    selector: "manager-nav-overview",
    titre: "Tableau de bord",
    texte:
      "Voici la vue d'ensemble : réservations du jour, couverts, commandes à traiter et activité récente. Les chiffres se rafraîchissent toutes les 30 secondes.",
    route: "/mainpage/restaurants",
  },
  {
    id: "manager-reservations",
    publicText:
      "Dans Reservations & orders, vous traitez les réservations et les commandes du jour. Vous pouvez installer les clients, terminer, déclarer un no-show ou annuler.",
    selector: "manager-nav-reservations",
    titre: "Réservations et commandes",
    texte:
      "Ici, vous traitez les réservations et les commandes du jour. Vous pouvez installer les clients, terminer, déclarer un no-show ou annuler.",
    route: "/mainpage/restaurants/reservations",
  },
  {
    id: "manager-salle",
    selector: "manager-nav-live",
    titre: "Salle en direct",
    texte:
      "Le plan de salle est coloré selon l'état de chaque table. Cliquez sur une table pour voir sa réservation et agir. Les alertes d'arrivée et de retard arrivent dans la cloche.",
    route: "/mainpage/restaurants/live",
  },
  {
    id: "manager-menu",
    selector: "manager-nav-menu",
    titre: "Menu et promotions",
    texte:
      "Créez vos catégories et vos plats, puis publiez le menu pour que les clients puissent précommander.",
    route: "/mainpage/restaurants/menu",
  },
  {
    id: "manager-tables",
    selector: "manager-nav-tables",
    titre: "Plan de salle",
    texte:
      "Dessinez vos tables et vos étages. Publiez le restaurant quand il a au moins une table active : il devient alors visible aux clients.",
    route: "/mainpage/restaurants/tables",
  },
  {
    id: "manager-ia",
    selector: "manager-nav-ai",
    titre: "Assistant IA",
    texte:
      "Posez vos questions sur votre restaurant : l'assistant lit vos vraies données, sans rien modifier.",
    route: "/mainpage/restaurants/ai",
  },
  {
    id: "manager-aide",
    publicText:
      "Une fois connecté, le bouton d'aide en haut de l'écran relance cette visite guidée à tout moment.",
    selector: "tour-help",
    titre: "Besoin d'aide ?",
    texte: "Ce bouton relance la visite guidée à tout moment.",
  },
];

const STAFF: TourStep[] = [
  {
    id: "staff-accueil",
    publicText:
      "À votre première connexion, choisissez votre restaurant et envoyez une demande d'adhésion. Le gérant doit l'accepter.",
    selector: "staff-nav-overview",
    titre: "Votre espace de service",
    texte:
      "Si vous n'avez pas encore de restaurant, choisissez-en un et envoyez une demande d'adhésion. Le gérant doit l'accepter.",
    route: "/mainpage/staff",
  },
  {
    id: "staff-reservations",
    selector: "staff-nav-reservations",
    titre: "Réservations du jour",
    texte: "Installez les clients à leur arrivée, puis terminez la réservation à leur départ.",
  },
  {
    id: "staff-commandes",
    selector: "staff-nav-orders",
    titre: "Commandes",
    texte: "Faites avancer chaque commande : en préparation, prête, puis livrée.",
  },
  {
    id: "staff-aide",
    publicText:
      "Une fois connecté, le bouton d'aide en haut de l'écran relance cette visite guidée à tout moment.",
    selector: "tour-help",
    titre: "Besoin d'aide ?",
    texte: "Ce bouton relance la visite guidée à tout moment.",
  },
];

export const TOUR_STEPS: Record<TourRole, TourStep[]> = {
  client: CLIENT,
  manager: MANAGER,
  staff: STAFF,
};

export const TOUR_STORAGE_PREFIX = "restivo_tour_";

/**
 * Étapes réservées à la démo automatique (parcours complet d'un profil).
 * Elles ne font pas partie des visites courtes : TOUR_STEPS ne les contient pas.
 */
export const DEMO_EXTRA_STEPS: TourStep[] = [
  {
    id: "manager-demo-intro",
    titre: "Votre restaurant est déjà prêt",
    texte:
      "Vous êtes connecté en tant que gérant de Dar Restivo, un restaurant déjà créé et publié. Nous allons parcourir toute l'expérience gérant : tableau de bord, réservations, salle en direct, menu, plan de salle, équipe et assistant.",
  },
  {
    id: "manager-demo-profile",
    selector: "manager-profile",
    titre: "La fiche du restaurant",
    texte:
      "Le nom du restaurant, en haut, ouvre sa fiche : contact, adresse, devise, fuseau horaire, type de cuisine, niveau de prix, logo et horaires d'ouverture, y compris de nuit.",
  },
  {
    id: "manager-demo-stats",
    selector: "manager-stats",
    titre: "Les chiffres du jour",
    texte:
      "Voici le tableau de bord. Quatre chiffres : les réservations du jour, les couverts attendus, les commandes à traiter et le chiffre d'affaires. Ils se rafraîchissent toutes les 30 secondes.",
  },
  {
    id: "manager-demo-ov-reservations",
    selector: "manager-overview-reservations",
    titre: "Les réservations du jour",
    texte: "Ici, les réservations de la journée, avec l'heure, la table et le nombre d'invités.",
  },
  {
    id: "manager-demo-ov-orders",
    selector: "manager-overview-orders",
    titre: "Les précommandes en cours",
    texte: "Dessous, les précommandes des clients, à suivre jusqu'à la livraison.",
  },
  {
    id: "manager-demo-ov-activity",
    selector: "manager-overview-activity",
    titre: "L'activité récente",
    texte:
      "Chaque réservation ou commande créée, modifiée ou annulée apparaît ici, pour savoir ce qui vient de se passer.",
  },
  {
    id: "manager-demo-bell",
    selector: "manager-bell",
    titre: "Les alertes en direct",
    texte:
      "La cloche vous prévient : client attendu, no-show possible, ou table qui dépasse son créneau.",
  },
  {
    id: "manager-demo-reservations",
    selector: "manager-page-reservations",
    titre: "Réservations",
    texte:
      "Choisissez le jour et filtrez par statut. Pour chaque réservation, seuls les boutons permis apparaissent : installer le client, terminer, déclarer un no-show ou annuler. Annuler une réservation annule aussi ses précommandes, et le client est prévenu.",
  },
  {
    id: "manager-demo-orders",
    selector: "manager-page-reservations",
    titre: "Commandes",
    texte:
      "Dans l'onglet Orders, faites avancer chaque commande : confirmée, en préparation, prête, puis livrée. Le client reçoit une notification à chaque étape.",
  },
  {
    id: "manager-demo-live",
    selector: "manager-page-live",
    titre: "La salle en direct",
    texte:
      "Chaque table est colorée selon son état : libre, bientôt réservée, occupée ou en dépassement. Cliquez sur une table pour voir sa réservation, installer le client, terminer ou déclarer un no-show. Les chronomètres suivent l'heure du serveur.",
  },
  {
    id: "manager-demo-menu",
    selector: "manager-page-menu",
    titre: "Menu et promotions",
    texte:
      "Créez des catégories et des plats avec des prix à trois décimales en dinar. Réordonnez-les avec les flèches, rendez un plat indisponible, créez des promotions, ouvrez l'aperçu en livre, puis publiez le menu.",
  },
  {
    id: "manager-demo-tables",
    selector: "manager-page-tables",
    titre: "Le plan de salle",
    texte:
      "Dessinez vos étages en 2D : tables, chaises, murs, bar. Ces tables sont celles que vos clients réservent. Le restaurant n'est visible que s'il a au moins une table active.",
  },
  {
    id: "manager-demo-staff",
    selector: "manager-page-staff",
    titre: "L'équipe",
    texte:
      "Acceptez ou refusez les demandes d'adhésion du personnel, et nommez ou retirez un manager.",
  },
  {
    id: "manager-demo-ai",
    selector: "manager-page-ai",
    titre: "L'assistant IA",
    texte:
      "Posez une question sur votre restaurant, par exemple les réservations du jour ou l'état des tables. L'assistant lit vos vraies données, sans rien modifier.",
  },
  {
    id: "manager-demo-fin",
    titre: "Fin du parcours gérant",
    texte:
      "Vous avez vu tout le parcours gérant, de la fiche du restaurant jusqu'à l'assistant. Merci de votre attention.",
  },
];
