"""Bibliothèque de cas tests anonymisés et synthétiques (§ 31 du cahier des charges).

Aucune donnée client réelle ne doit figurer ici.
"""

from engine.modeles import Contexte, Dirigeant, Entreprise, Foyer, Hypotheses, Objectifs

H = Hypotheses(pas_optimisation=2000)


def _ctx(**kw) -> Contexte:
    base = dict(hypotheses=H, objectifs=Objectifs())
    base.update(kw)
    return Contexte(**base)


CAS = {

    "01_sarl_gerant_seul": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=280000, resultat_avant_remuneration=95000,
                              capital_social=8000, compte_courant_associe_moyen=5000,
                              nb_salaries=0, masse_salariale=0, tresorerie=60000),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=42,
                            remuneration_actuelle=60000, dividendes_actuels=10000),
        foyer=Foyer(situation="couple", nb_enfants=1),
    ),

    "02_sarl_gerant_plus_salarie": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=420000, resultat_avant_remuneration=130000,
                              capital_social=15000, compte_courant_associe_moyen=10000,
                              nb_salaries=1, masse_salariale=32000, tresorerie=90000),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=0.8, age=48,
                            remuneration_actuelle=75000, dividendes_actuels=15000),
        foyer=Foyer(situation="couple", nb_enfants=2),
    ),

    "03_sarl_conjoint_salarie": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=350000, resultat_avant_remuneration=120000,
                              capital_social=10000, compte_courant_associe_moyen=8000,
                              nb_salaries=1, masse_salariale=28000, tresorerie=70000,
                              conjoint_salarie=True, conjoint_salarie_anciennete_mois=18,
                              pee_existant=True, pereco_existant=True),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=50,
                            remuneration_actuelle=70000, dividendes_actuels=12000),
        foyer=Foyer(situation="couple", nb_enfants=2, autres_revenus_salaires=28000),
    ),

    "04_sarl_dividendes_sous_seuil": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=500000, resultat_avant_remuneration=150000,
                              capital_social=200000, primes_emission=50000,
                              compte_courant_associe_moyen=100000,
                              nb_salaries=2, masse_salariale=65000, tresorerie=200000),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=45,
                            remuneration_actuelle=45000, dividendes_actuels=30000),
        foyer=Foyer(situation="couple", nb_enfants=0),
    ),

    "05_sarl_dividendes_au_dessus_seuil": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=500000, resultat_avant_remuneration=150000,
                              capital_social=8000, primes_emission=0,
                              compte_courant_associe_moyen=2000,
                              nb_salaries=2, masse_salariale=65000, tresorerie=200000),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=45,
                            remuneration_actuelle=45000, dividendes_actuels=60000),
        foyer=Foyer(situation="couple", nb_enfants=0),
    ),

    "06_sarl_prise_en_charge_cotisations": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=400000, resultat_avant_remuneration=140000,
                              capital_social=20000, compte_courant_associe_moyen=30000,
                              nb_salaries=1, masse_salariale=30000, tresorerie=110000),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=52,
                            remuneration_actuelle=80000, dividendes_actuels=20000),
        foyer=Foyer(situation="couple", nb_enfants=1),
    ),

    "07_sasu_president_remunere": _ctx(
        entreprise=Entreprise(forme="SASU", ca_ht=300000, resultat_avant_remuneration=110000,
                              capital_social=5000, nb_salaries=0, masse_salariale=0,
                              tresorerie=80000),
        dirigeant=Dirigeant(fonction="president_sas", detention=1.0, age=40,
                            remuneration_actuelle=90000, dividendes_actuels=0),
        foyer=Foyer(situation="celibataire", nb_enfants=0),
    ),

    "08_sasu_dividendes": _ctx(
        entreprise=Entreprise(forme="SASU", ca_ht=300000, resultat_avant_remuneration=110000,
                              capital_social=5000, nb_salaries=0, masse_salariale=0,
                              tresorerie=80000),
        dirigeant=Dirigeant(fonction="president_sas", detention=1.0, age=40,
                            remuneration_actuelle=20000, dividendes_actuels=60000),
        foyer=Foyer(situation="celibataire", nb_enfants=0),
    ),

    "09_pee_avec_abondement": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=600000, resultat_avant_remuneration=170000,
                              capital_social=30000, compte_courant_associe_moyen=20000,
                              nb_salaries=4, masse_salariale=140000, tresorerie=150000,
                              pee_existant=True),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=46,
                            remuneration_actuelle=85000, dividendes_actuels=20000),
        foyer=Foyer(situation="couple", nb_enfants=2),
    ),

    "10_pereco_avec_abondement": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=600000, resultat_avant_remuneration=170000,
                              capital_social=30000, compte_courant_associe_moyen=20000,
                              nb_salaries=4, masse_salariale=140000, tresorerie=150000,
                              pereco_existant=True),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=57,
                            remuneration_actuelle=85000, dividendes_actuels=20000),
        foyer=Foyer(situation="couple", nb_enfants=0),
    ),

    "11_interessement_vers_pee": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=800000, resultat_avant_remuneration=220000,
                              capital_social=50000, compte_courant_associe_moyen=40000,
                              nb_salaries=6, masse_salariale=210000, tresorerie=200000,
                              pee_existant=True, accord_interessement=True),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=44,
                            remuneration_actuelle=100000, dividendes_actuels=25000),
        foyer=Foyer(situation="couple", nb_enfants=3),
    ),

    "12_interessement_vers_pereco": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=800000, resultat_avant_remuneration=220000,
                              capital_social=50000, compte_courant_associe_moyen=40000,
                              nb_salaries=6, masse_salariale=210000, tresorerie=200000,
                              pereco_existant=True, accord_interessement=True),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=55,
                            remuneration_actuelle=100000, dividendes_actuels=25000),
        foyer=Foyer(situation="couple", nb_enfants=1),
    ),

    "13_per_individuel_tns": _ctx(
        entreprise=Entreprise(forme="EURL", ca_ht=250000, resultat_avant_remuneration=120000,
                              capital_social=5000, compte_courant_associe_moyen=0,
                              nb_salaries=0, tresorerie=70000),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=49,
                            remuneration_actuelle=100000, dividendes_actuels=0),
        foyer=Foyer(situation="couple", nb_enfants=1, plafond_per_reporte=25000),
    ),

    "14_haut_revenu": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=2500000, resultat_avant_remuneration=600000,
                              capital_social=100000, compte_courant_associe_moyen=150000,
                              nb_salaries=12, masse_salariale=520000, tresorerie=800000,
                              pee_existant=True, pereco_existant=True, accord_interessement=True),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=51,
                            remuneration_actuelle=250000, dividendes_actuels=120000),
        foyer=Foyer(situation="couple", nb_enfants=2),
    ),

    "15_proche_retraite": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=450000, resultat_avant_remuneration=160000,
                              capital_social=40000, compte_courant_associe_moyen=60000,
                              nb_salaries=3, masse_salariale=95000, tresorerie=300000,
                              pereco_existant=True),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=62,
                            remuneration_actuelle=90000, dividendes_actuels=30000),
        foyer=Foyer(situation="couple", nb_enfants=0),
    ),

    "16_foyer_cehr": _ctx(
        entreprise=Entreprise(forme="SAS", ca_ht=4000000, resultat_avant_remuneration=900000,
                              capital_social=200000, nb_salaries=20, masse_salariale=900000,
                              tresorerie=1500000,
                              pee_existant=True, pereco_existant=True),
        dirigeant=Dirigeant(fonction="president_sas", detention=0.9, age=53,
                            remuneration_actuelle=350000, dividendes_actuels=200000),
        foyer=Foyer(situation="couple", nb_enfants=1, autres_revenus_salaires=90000,
                    revenus_capital_hors_scenario=40000),
    ),

    "18_reserves_distribuables": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=400000, resultat_avant_remuneration=120000,
                              capital_social=30000, compte_courant_associe_moyen=20000,
                              reserves_distribuables=250000, nb_salaries=2, masse_salariale=60000,
                              tresorerie=400000),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=55,
                            remuneration_actuelle=60000, dividendes_actuels=150000),
        foyer=Foyer(situation="couple", nb_enfants=1),
    ),

    "19_parent_isole": _ctx(
        entreprise=Entreprise(forme="SASU", ca_ht=320000, resultat_avant_remuneration=115000,
                              capital_social=10000, nb_salaries=0, tresorerie=60000),
        dirigeant=Dirigeant(fonction="president_sas", detention=1.0, age=41,
                            remuneration_actuelle=80000, dividendes_actuels=10000),
        foyer=Foyer(situation="celibataire", nb_enfants=3, parent_isole=True),
    ),

    "20_capital_externe_cdhr": _ctx(
        entreprise=Entreprise(forme="SAS", ca_ht=3000000, resultat_avant_remuneration=700000,
                              capital_social=150000, nb_salaries=15, masse_salariale=700000,
                              tresorerie=900000, pee_existant=True, pereco_existant=True),
        dirigeant=Dirigeant(fonction="president_sas", detention=0.95, age=56,
                            remuneration_actuelle=300000, dividendes_actuels=150000),
        foyer=Foyer(situation="celibataire", nb_enfants=0,
                    revenus_capital_hors_scenario=300000),
    ),

    # Cas conservé comme garde-fou : il vérifie qu'aucune « falaise » n'apparaît
    # au voisinage de 3 PASS, le barème maladie étant continu (art. D.621-1 CSS).
    "21_assiette_voisinage_3_pass": _ctx(
        entreprise=Entreprise(forme="EURL", ca_ht=600000, resultat_avant_remuneration=260000,
                              capital_social=20000, compte_courant_associe_moyen=10000,
                              nb_salaries=0, tresorerie=150000),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=47,
                            remuneration_actuelle=195000, dividendes_actuels=0),
        foyer=Foyer(situation="couple", nb_enfants=0),
    ),

    "22_effectif_au_dela_forfait_social": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=6000000, resultat_avant_remuneration=400000,
                              capital_social=100000, compte_courant_associe_moyen=50000,
                              nb_salaries=80, masse_salariale=2600000, tresorerie=700000,
                              pee_existant=True, pereco_existant=True, accord_interessement=True),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=50,
                            remuneration_actuelle=150000, dividendes_actuels=50000),
        foyer=Foyer(situation="couple", nb_enfants=2),
    ),

    "17_changement_sarl_vers_sas": _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=700000, resultat_avant_remuneration=200000,
                              capital_social=25000, compte_courant_associe_moyen=15000,
                              nb_salaries=5, masse_salariale=180000, tresorerie=250000),
        dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0, age=47,
                            remuneration_actuelle=110000, dividendes_actuels=40000),
        foyer=Foyer(situation="couple", nb_enfants=2),
    ),
}
