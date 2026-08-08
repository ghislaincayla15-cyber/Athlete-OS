"""Modèles de données d'entrée et de sortie du moteur."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# =============================================================================
# ENTRÉES
# =============================================================================

@dataclass
class Entreprise:
    forme: str = "SARL"                       # SARL | EURL | SAS | SASU
    regime_fiscal: str = "IS"                 # IS | IR
    activite: str = "commerciale"             # commerciale | artisanale | liberale
    ca_ht: float = 0.0
    resultat_avant_remuneration: float = 0.0  # résultat avant rémunération du dirigeant et avant IS
    tresorerie: float = 0.0
    capitaux_propres: float = 0.0
    capital_social: float = 0.0
    primes_emission: float = 0.0
    compte_courant_associe_moyen: float = 0.0  # solde MOYEN ANNUEL (art. R.131-7 CSS)
    reserves_distribuables: float = 0.0
    nb_salaries: int = 0                       # hors dirigeant
    masse_salariale: float = 0.0
    anciennete_annees: int = 3
    conjoint_salarie: bool = False
    conjoint_salarie_anciennete_mois: int = 0
    capital_libere: bool = True
    detention_personnes_physiques: float = 1.0
    accord_interessement: bool = False
    pee_existant: bool = False
    pereco_existant: bool = False
    reglement_abondement_pee_pct: float = 3.0      # multiple du versement prévu au règlement
    reglement_abondement_pereco_pct: float = 3.0


@dataclass
class Dirigeant:
    fonction: str = "gerant_majoritaire"   # gerant_majoritaire | gerant_minoritaire | president_sas | ei
    detention: float = 1.0                 # % de détention, collège de gérance inclus
    age: int = 45
    remuneration_actuelle: float = 0.0     # coût entreprise actuel
    dividendes_actuels: float = 0.0
    # Revenu professionnel IMPOSABLE de l'année N-1, tel qu'il figure sur l'avis
    # d'imposition. Il commande les plafonds assis sur N-1 (PER de droit commun,
    # versement volontaire, enveloppe d'intéressement). Laissé à None, le moteur
    # le reconstitue à partir de la situation simulée, ce qui n'est qu'un proxy.
    revenu_professionnel_n1: Optional[float] = None
    profession_reglementee: bool = False
    affiliation_cadre: bool = True         # pour l'APEC (assimilé salarié)
    taux_atmp: Optional[float] = None      # taux notifié par la Carsat, sinon défaut du référentiel


@dataclass
class Foyer:
    situation: str = "couple"      # celibataire | couple
    nb_enfants: int = 0
    parent_isole: bool = False
    autres_revenus_salaires: float = 0.0   # revenus nets imposables du conjoint, avant abattement 10 %
    autres_revenus_imposables: float = 0.0 # fonciers, BIC, etc. déjà nets
    revenus_capital_hors_scenario: float = 0.0
    plafond_per_reporte: float = 0.0       # reliquats des années antérieures
    per_deja_verse: float = 0.0

    @property
    def nb_parts(self) -> float:
        base = 2.0 if self.situation == "couple" else 1.0
        n = self.nb_enfants
        parts = 0.5 * min(n, 2) + 1.0 * max(0, n - 2)
        if self.parent_isole and n > 0:
            parts += 0.5
        return base + parts


@dataclass
class Objectifs:
    """Pondérations du score multicritère. Somme normalisée par le moteur."""
    liquidite: float = 1.0
    retraite: float = 1.0
    protection: float = 0.5
    fiscalite: float = 1.0
    capitalisation: float = 1.0
    simplicite: float = 0.5
    robustesse: float = 1.0
    objectif_principal: str = "compromis"
    # net_immediat | patrimoine_net | cout_entreprise | retraite | compromis


@dataclass
class Hypotheses:
    rendement_epargne: float = 0.04
    inflation: float = 0.02
    croissance_pass: float = 0.02
    horizon_annees: int = 10
    taux_adhesion_salaries: float = 0.30      # part des salariés utilisant l'abondement
    cout_illiquidite_annuel: float = 0.005    # décote appliquée à l'épargne bloquée
    fiscalite_future_epargne_retraite: float = 0.20
    coef_valeur_tresorerie_societe: float = 0.75  # valeur, pour le dirigeant, d'1 € conservé dans la société
    pas_optimisation: float = 500.0


@dataclass
class Contexte:
    entreprise: Entreprise = field(default_factory=Entreprise)
    dirigeant: Dirigeant = field(default_factory=Dirigeant)
    foyer: Foyer = field(default_factory=Foyer)
    objectifs: Objectifs = field(default_factory=Objectifs)
    hypotheses: Hypotheses = field(default_factory=Hypotheses)
    millesime: int = 2026


@dataclass
class Allocation:
    """Affectation de la valeur économique disponible dans l'entreprise."""
    cout_remuneration: float = 0.0   # coût entreprise consacré à la rémunération du dirigeant
    versement_pee: float = 0.0       # versement volontaire du dirigeant sur le PEE (sur son net)
    abondement_pee: float = 0.0
    versement_pereco: float = 0.0
    abondement_pereco: float = 0.0
    interessement_enveloppe: float = 0.0   # enveloppe globale (dirigeant + salariés)
    interessement_affecte_plan: bool = True
    versement_per_individuel: float = 0.0  # versement personnel du dirigeant, sur son net
    dividendes_bruts: float = 0.0
    option_bareme_dividendes: bool = False


# =============================================================================
# SORTIES
# =============================================================================

@dataclass
class LigneCotisation:
    code: str
    libelle: str
    assiette: float
    taux: float
    montant: float
    payeur: str            # societe | dirigeant
    droits: str
    caractere: str         # contributif | contributif_partiel | solidarite
    note: str = ""


@dataclass
class Droits:
    trimestres: float = 0.0
    points_rci: float = 0.0
    points_agirc_arrco: float = 0.0
    rente_base_annuelle: float = 0.0
    rente_complementaire_annuelle: float = 0.0
    valeur_actuelle_droits: float = 0.0
    protection_sociale: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Resultat:
    libelle: str = ""
    allocation: Optional[Allocation] = None
    # entreprise
    cout_entreprise: float = 0.0
    resultat_fiscal: float = 0.0
    impot_societes: float = 0.0
    resultat_net_societe: float = 0.0
    tresorerie_residuelle: float = 0.0
    cout_collectif_salaries: float = 0.0
    # dirigeant
    cotisations: List[LigneCotisation] = field(default_factory=list)
    cotisations_totales: float = 0.0
    csg_crds_activite: float = 0.0
    remuneration_nette: float = 0.0
    revenu_imposable_remuneration: float = 0.0
    dividendes_nets: float = 0.0
    prelevements_sociaux_capital: float = 0.0
    impot_revenu: float = 0.0
    impot_revenu_sans_strategie: float = 0.0
    cehr: float = 0.0
    cdhr: float = 0.0
    # patrimoine
    net_immediat: float = 0.0
    epargne_bloquee: float = 0.0
    epargne_retraite: float = 0.0
    droits: Droits = field(default_factory=Droits)
    valeur_patrimoniale: float = 0.0
    valeur_patrimoniale_hors_droits: float = 0.0
    valeur_globale: float = 0.0   # patrimoine du dirigeant + trésorerie société valorisée
    efficacite_marginale: float = 0.0
    # conformité
    conformite: str = "conforme"
    robustesse: str = "A"
    motifs_robustesse: List[str] = field(default_factory=list)
    alertes: List[Dict[str, str]] = field(default_factory=list)
    controles: List[Dict[str, Any]] = field(default_factory=list)
    detail: Dict[str, Any] = field(default_factory=dict)
