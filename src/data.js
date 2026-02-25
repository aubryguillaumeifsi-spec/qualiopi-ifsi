export const NOM_ETABLISSEMENT = "IFSI du CHAM";
export const TODAY = new Date().toISOString().split("T")[0];

// Liste officielle de l'équipe
export const RESPONSABLES = [
  "RETARDATO Clémentine (Directrice des soins)",
  "TZOTZIS Christelle (Coordinatrice pédagogique)",
  "AUBRY Guillaume (1ere année)",
  "KERBIDI Julie (1ere année)",
  "LAFONT Laura (1ere année)",
  "LEROY Sandra (1ere année)",
  "MARTIN Audrey (1ere année - Référente ABS)",
  "CHARLES Valérie (2eme année)",
  "HEGO Coralie (2eme année)",
  "JOUBAUD Virginie (2eme année)",
  "KRYLYSCHIN Virginie (2eme année)",
  "BRASSINE Déborah (3eme année)",
  "LA GUMINA Samantha (3eme année)",
  "MONTAINT Sophie (3eme année)",
  "SONVEAU Marie-Cécile (3eme année)",
  "PENIN Angélique (Formatrice AS)",
  "ROUSSEAU Caroline (Formatrice AS)",
  "FROMONT Aurélie (Formatrice AS)",
  "CARRE Joris (Documentaliste)",
  "QUAAK Jan (Référent TICE)",
  "HURTER Nathalie (Secrétariat)",
  "MAITREHUT Irène (Secrétariat)",
  "MELITO SAIHI Mélanie (Secrétariat)",
  "RATTEZ Eva (Secrétariat)"
];

// Configuration des couleurs par métiers (utilisées dans les badges et l'export Excel)
export const ROLE_COLORS = {
  "Directrice des soins": { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" }, // Bleu
  "Coordinatrice pédagogique": { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" }, // Orange
  "1ere année": { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" }, // Vert Emeraude
  "1ere année - Référente ABS": { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" }, // Vert Emeraude
  "2eme année": { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" }, // Vert pomme
  "3eme année": { bg: "#dcfce7", text: "#166534", border: "#86efac" }, // Vert plus foncé
  "Formatrice AS": { bg: "#fdf4ff", text: "#a21caf", border: "#f5d0fe" }, // Fuchsia
  "Documentaliste": { bg: "#fefce8", text: "#a16207", border: "#fef08a" }, // Jaune moutarde
  "Référent TICE": { bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd" }, // Bleu cyan
  "Secrétariat": { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" }, // Violet
  "Défaut": { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" } // Gris par défaut
};

export const DEFAULT_CRITERES = [
  { id: 1, num: "Indicateur 1", critere: 1, titre: "Information sur les prestations", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 2, num: "Indicateur 2", critere: 1, titre: "Indicateurs de résultats", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 3, num: "Indicateur 3", critere: 1, titre: "Obtention de la certification", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 4, num: "Indicateur 4", critere: 2, titre: "Analyse du besoin", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 5, num: "Indicateur 5", critere: 2, titre: "Objectifs de la prestation", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 6, num: "Indicateur 6", critere: 2, titre: "Contenus et mise en oeuvre", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 7, num: "Indicateur 7", critere: 2, titre: "Adéquation aux exigences de certification", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 8, num: "Indicateur 8", critere: 2, titre: "Positionnement à l'entrée", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 9, num: "Indicateur 9", critere: 3, titre: "Conditions d'implication des publics", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 10, num: "Indicateur 10", critere: 3, titre: "Adaptation de la prestation", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 11, num: "Indicateur 11", critere: 3, titre: "Évaluation de l'atteinte des objectifs", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 12, num: "Indicateur 12", critere: 3, titre: "Mesures pour favoriser l'engagement", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 13, num: "Indicateur 13", critere: 3, titre: "Alternance et articulation des apprentissages", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 14, num: "Indicateur 14", critere: 3, titre: "Accompagnement socio-professionnel", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 15, num: "Indicateur 15", critere: 3, titre: "Droits et devoirs de l'apprenti", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 16, num: "Indicateur 16", critere: 3, titre: "Conditions de présentation aux examens", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 17, num: "Indicateur 17", critere: 4, titre: "Moyens humains et techniques", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 18, num: "Indicateur 18", critere: 4, titre: "Coordination des acteurs", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 19, num: "Indicateur 19", critere: 4, titre: "Ressources pédagogiques", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 20, num: "Indicateur 20", critere: 4, titre: "Personnel dédié à la mobilité", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 21, num: "Indicateur 21", critere: 5, titre: "Compétences des intervenants", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 22, num: "Indicateur 22", critere: 5, titre: "Maintien et développement des compétences", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 23, num: "Indicateur 23", critere: 6, titre: "Veille légale et réglementaire", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 24, num: "Indicateur 24", critere: 6, titre: "Veille métiers et compétences", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 25, num: "Indicateur 25", critere: 6, titre: "Veille pédagogique et technologique", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 26, num: "Indicateur 26", critere: 6, titre: "Mobilisation d'un réseau Handicap", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 27, num: "Indicateur 27", critere: 6, titre: "Pilotage de la sous-traitance", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 28, num: "Indicateur 28", critere: 6, titre: "Périodes de formation en situation de travail", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 29, num: "Indicateur 29", critere: 6, titre: "Insertion professionnelle (Apprentissage)", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 30, num: "Indicateur 30", critere: 7, titre: "Recueil des appréciations", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 31, num: "Indicateur 31", critere: 7, titre: "Traitement des réclamations et aléas", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
  { id: 32, num: "Indicateur 32", critere: 7, titre: "Amélioration continue", responsables: [], delai: TODAY, statut: "non-evalue", notes: "", attendus: "", preuves: "" },
];

export const CRITERES_LABELS = {
  1: { label: "Information des publics",         color: "#1d4ed8" },
  2: { label: "Identification des objectifs",    color: "#6d28d9" },
  3: { label: "Adaptation aux publics",          color: "#be185d" },
  4: { label: "Adéquation des moyens",           color: "#b45309" },
  5: { label: "Qualification des intervenants",  color: "#065f46" },
  6: { label: "Inscription dans l'environnement",color: "#0e7490" },
  7: { label: "Recueil et prise en compte",      color: "#b91c1c" },
};

export const STATUT_CONFIG = {
  "non-evalue":   { label: "Non evalué",   color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  "conforme":     { label: "Conforme",     color: "#065f46", bg: "#d1fae5", border: "#6ee7b7" },
  "en-cours":     { label: "En cours",     color: "#92400e", bg: "#fef3c7", border: "#fcd34d" },
  "non-conforme": { label: "Non conforme", color: "#991b1b", bg: "#fee2e2", border: "#fca5a5" },
};

export const GUIDE_QUALIOPI = {
  1: {
    appreciation: "Le prestataire diffuse une information accessible au public, détaillée et vérifiable sur les prestations proposées : prérequis, objectifs, durée, modalités et délais d'accès, tarifs, contacts, méthodes mobilisées et modalités d'évaluation, accessibilité aux personnes handicapées.",
    niveau: "Donner une information accessible, exhaustive sur la prestation, c'est-à-dire sur son contenu et sur l'intégralité des items mentionnés. Cette information doit être à jour.",
    preuves: "Tous supports et outils d'information (plaquette, réseaux sociaux, sites internet, supports de publicité, salons, supports de contractualisation, conditions générales de vente). Pour les PSH, tous supports de présentation de la politique d'accessibilité, conditions d'accès.",
    obligations: "VAE : les contraintes et exigences de la démarche sont clairement formalisées et communiquées... Pour les formations certifiantes : l'information mentionne le libellé exact de la certification, le code RNCP/RS...",
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par une information partiellement accessible OU par l'absence ponctuelle et non répétitive de certains items dans la communication."
  },
  2: {
    appreciation: "Le prestataire diffuse des indicateurs de résultats adaptés à la nature des prestations mises en œuvre et des publics accueillis.",
    niveau: "Donner une information chiffrée permettant de suivre les résultats de la prestation au regard des objectifs.",
    preuves: "Tous supports et outils d'information, rapports d'activités, bilans, résultats d'enquêtes, indicateurs de performance.",
    obligations: "CFA : les indicateurs de résultats obligatoires sont ceux cités à l'article L. 6111-8 du code du travail. Nouveaux entrants : des indicateurs sont pré-identifiés...",
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par une information insuffisamment détaillée."
  },
  3: {
    appreciation: "Lorsque le prestataire met en œuvre des prestations conduisant à une certification professionnelle, il informe sur les taux d'obtention des certifications préparées, les possibilités de valider un/ou des blocs de compétences, ainsi que sur les équivalences, passerelles, suites de parcours et les débouchés.",
    niveau: "Donner au public une information accessible, exhaustive (c'est-à-dire sur l'intégralité des items mentionnés) et actualisée.",
    preuves: "Tous supports et outils d'information (plaquette, réseaux sociaux, sites internet...), taux d'obtention d'une certification, trajectoires d'évolution.",
    obligations: "Nouveaux entrants : la communication sur les taux d'obtention des certifications est auditée lors de l'audit de surveillance.",
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par une information partiellement accessible ou par l'absence ponctuelle et non répétitive de certains items."
  },
  4: {
    appreciation: "Le prestataire analyse le besoin du bénéficiaire en lien avec l'entreprise et/ou le financeur concerné(s).",
    niveau: "Démontrer comment le besoin du bénéficiaire est analysé en fonction de la finalité de la prestation.",
    preuves: "Tout support synthétisant les besoins identifiés du bénéficiaire ou d'un groupe de bénéficiaires (grilles d'analyse, diagnostics préalables, dossiers d'admission, comptes rendus d'entretiens).",
    obligations: "Dans le cas où le prestataire accueille un public en situation de handicap : le prestataire démontre qu'il prend en compte les situations de handicap et les besoins en compensation.",
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  5: {
    appreciation: "Le prestataire définit les objectifs opérationnels et évaluables de la prestation.",
    niveau: "Démontrer que les objectifs spécifiques à la prestation ont été définis et peuvent faire l'objet d'une évaluation.",
    preuves: "Tous supports et outils d'analyse, existence d'indicateurs de suivi et de résultats, supports de contractualisation, identification des compétences visées par la prestation.",
    obligations: "Pour les formations certifiantes : les objectifs doivent être conformes aux objectifs fixés par la certification inscrite au RNCP/RS.",
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  6: {
    appreciation: "Le prestataire établit les contenus et les modalités de mise en œuvre de la prestation, adaptés aux objectifs définis et aux publics bénéficiaires.",
    niveau: "Démontrer que les contenus et modalités de mise en œuvre des prestations sont adaptés aux objectifs définis en fonction des bénéficiaires.",
    preuves: "Parcours, déroulés et séquences, grilles et modalités d'évaluation, modalités techniques et pédagogiques d'accompagnement (présentiel, à distance, mixte).",
    obligations: "Pour les formations certifiantes : Le prestataire démontre que le contenu de la prestation est en cohérence avec les objectifs inscrits dans le référentiel.",
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  7: {
    appreciation: "Lorsque le prestataire met en œuvre des prestations conduisant à une certification professionnelle, il s'assure de l'adéquation du ou des contenus de la prestation aux exigences de la certification visée.",
    niveau: "Démontrer l'adéquation du contenu aux compétences ciblées et aux épreuves d'évaluation de la certification.",
    preuves: "Présentation de l'offre de formation en cohérence avec le référentiel de la certification, habilitation du prestataire, tableau croisé du contenu et référentiel.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  8: {
    appreciation: "Le prestataire détermine les procédures de positionnement et d'évaluation des acquis à l'entrée de la prestation.",
    niveau: "Démontrer l'existence de procédures de positionnement et d'évaluation des acquis à l'entrée de la prestation adaptée aux publics et modalités de formations.",
    preuves: "Diagnostic préalable, entretien, évaluation des acquis à l'entrée (quizz, QCM, exercices, mise en situation), outils de mesure des écarts en termes de compétences.",
    obligations: "Pour les formations certifiantes : Le prestataire démontre que les prérequis sont cohérents avec ceux de la certification inscrite au RNCP/RS.",
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par un dispositif existant mais incomplet."
  },
  9: {
    appreciation: "Le prestataire informe les publics bénéficiaires des conditions de déroulement de la prestation.",
    niveau: "Les modalités d'accueil et les conditions de déroulement de la prestation sont formalisées et diffusées.",
    preuves: "Règlement intérieur, livret d'accueil, convocation, noms des référents pédagogiques et administratifs, aspects périphériques (hébergement, restauration...), modalités d'accès PSH.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par une information incomplète."
  },
  10: {
    appreciation: "Le prestataire met en œuvre et adapte la prestation, l'accompagnement et le suivi aux publics bénéficiaires.",
    niveau: "La prestation est adaptée aux situations et profils des bénéficiaires, lorsque l'analyse du besoin en établit la nécessité : contenus, accompagnement, suivi.",
    preuves: "Durées et contenus des prestations, emplois du temps, groupes de niveaux, entretiens, fonction dédiée (référent pédagogique), livret de suivi. Pour les PSH : modalités d'aménagement.",
    obligations: "CFA : Outre l'adaptation éventuelle, le prestataire met en œuvre les dispositions de la loi relatives aux obligations des CFA pour l'accompagnement des apprentis.",
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  11: {
    appreciation: "Le prestataire évalue l'atteinte par les publics bénéficiaires des objectifs de la prestation.",
    niveau: "Démontrer qu'un processus d'évaluation existe, est formalisé et mis en œuvre. Il permet d'apprécier l'atteinte des objectifs.",
    preuves: "Outils d'évaluation des acquis en cours et en fin de prestation (à chaud et à froid), outils d'auto-évaluation, bilans intermédiaires, taux de réussite.",
    obligations: "Nouveaux entrants : un processus d'évaluation existe et est formalisé. Sa mise en œuvre sera auditée lors de l'audit de surveillance.",
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  12: {
    appreciation: "Le prestataire décrit et met en œuvre les mesures pour favoriser l'engagement des bénéficiaires et prévenir les ruptures de parcours.",
    niveau: "Démontrer que des mesures formalisées existent et sont mises en œuvre. Cet indicateur s'applique aux formations d'une durée supérieure à 2 jours.",
    preuves: "Procédure de gestion des abandons et de relance systématique, carnet de rendez-vous, outils et méthodes favorisant l'implication du bénéficiaire. Mesures de prévention pour PSH.",
    obligations: "CFA : le prestataire apporte un accompagnement afin de prévenir ou résoudre les difficultés d'ordre social et matériel susceptibles de mettre en péril le contrat.",
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par une mise en œuvre partielle des mesures définies."
  },
  13: {
    appreciation: "Pour les formations en alternance, le prestataire, en lien avec l'entreprise anticipe avec l'apprenant les missions confiées, à court, moyen et long terme, et assure la coordination et la progressivité des apprentissages réalisés en centre de formation et en entreprise.",
    niveau: "Démontrer que les principes de la pédagogie de l'alternance sont mis en œuvre, grâce à un processus formalisé d'articulation itératif des apprentissages.",
    preuves: "Tout outil de liaison entre l'entreprise, le bénéficiaire et le prestataire : carnet de suivi, preuves de dialogue, plannings, comptes rendus d'entretien.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par une mise en œuvre partielle des processus définis."
  },
  14: {
    appreciation: "Le prestataire met en œuvre un accompagnement socio-professionnel, éducatif et relatif à l'exercice de la citoyenneté.",
    niveau: "Démontrer que l'accompagnement de l'apprenant est formalisé et mis en œuvre par la mise en place de projets spécifiques.",
    preuves: "Mise en place de projets spécifiques d'activités sportives, ateliers culturels, éducation aux écrans, culture à l'exercice de la citoyenneté, dispositifs d'aides financières.",
    obligations: "Nouveaux entrants : l'accompagnement est formalisé. Sa mise en œuvre sera auditée lors de l'audit de surveillance.",
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  15: {
    appreciation: "Le prestataire informe les apprentis de leurs droits et devoirs en tant qu'apprentis et salariés ainsi que des règles applicables en matière de santé et de sécurité en milieu professionnel.",
    niveau: "Démontrer que les apprentis sont informés des droits et devoirs des salariés /apprentis et sur les règles applicables en matière de santé et de sécurité.",
    preuves: "Règlement intérieur du CFA, supports d'informations, supports de contractualisation, compte-rendu de réunions d'informations collectives, livret d'accueil.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  16: {
    appreciation: "Lorsque le prestataire met en œuvre des formations conduisant à une certification professionnelle, il s'assure que les conditions de présentation des bénéficiaires à la certification respectent les exigences formelles de l'autorité de certification.",
    niveau: "Le prestataire respecte les exigences formelles de l'autorité de certification lorsqu'il présente des candidats à la certification qu'il propose.",
    preuves: "Information communiquée aux bénéficiaires sur le déroulement de l'évaluation, preuve d'inscription, habilitation du prestataire à évaluer, règlement d'organisation des examens.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  17: {
    appreciation: "Le prestataire met à disposition ou s'assure de la mise à disposition des moyens humains et techniques adaptés et d'un environnement approprié (conditions, locaux, équipements, plateaux techniques...).",
    niveau: "Démontrer que les locaux, les équipements, les moyens humains sont en adéquation avec les objectifs de la ou des prestation(s).",
    preuves: "Bail OU contrat de location, registre public d'accessibilité, matériel adéquat (vidéo projecteur, plateaux techniques, chantiers pédagogiques, salles de simulation), CV des intervenants.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par un défaut dans les moyens ponctuel et non répétitif."
  },
  18: {
    appreciation: "Le prestataire mobilise et coordonne les différents intervenants internes et/ou externes (pédagogiques, administratifs, logistiques, commerciaux...).",
    niveau: "Le prestataire identifie, selon les fonctions nécessaires aux prestations, les intervenants dont il assure la coordination.",
    preuves: "Organigramme fonctionnel, liste des intervenants internes ou externes, contrats de travail, liste des référents pédagogiques, administratifs et handicap, plannings.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par un défaut ponctuel de coordination."
  },
  19: {
    appreciation: "Le prestataire met à disposition du bénéficiaire des ressources pédagogiques et permet à celui-ci de se les approprier.",
    niveau: "Démontrer que les ressources pédagogiques sont cohérentes avec les objectifs des prestations, sont disponibles et que des dispositions sont mises en place afin de permettre l'appropriation.",
    preuves: "Supports de cours, vidéos, fiches pratiques, liste des ressources documentaires (fiches RNCP...), plateforme e-learning, modalités d'accès, tutos, assistance.",
    obligations: "Pour la formation à distance : La mise en œuvre comprend une assistance technique et pédagogique appropriée pour accompagner le bénéficiaire.",
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par un défaut ponctuel et non répétitif dans les ressources et les moyens mis à disposition."
  },
  20: {
    appreciation: "Le prestataire dispose d'un personnel dédié à l'appui à la mobilité nationale et internationale, d'un référent handicap et d'un conseil de perfectionnement.",
    niveau: "Le prestataire présente : la liste des membres du conseil de perfectionnement ; la liste des personnes dédiées à la mobilité ; le nom et contact du référent handicap et les actions mises en œuvre.",
    preuves: "Nom et qualité des membres du conseil de perfectionnement, Nom et qualité des personnes dédiées à la mobilité, Nom du référent handicap et PV de nomination, Missions remplies et exemples d'actions menées.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  21: {
    appreciation: "Le prestataire détermine, mobilise et évalue les compétences des différents intervenants internes et/ou externes, adaptées aux prestations.",
    niveau: "Démontrer que les compétences requises pour réaliser les prestations ont été définies en amont et sont adaptées aux prestations. La maîtrise de ces compétences est vérifiée.",
    preuves: "Analyse des besoins de compétences, modalités de recrutement, entretiens professionnels, CV, formations initiales et continues des intervenants, sensibilisation handicap.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  22: {
    appreciation: "Le prestataire entretient et développe les compétences de ses salariés, adaptées aux prestations qu'il délivre.",
    niveau: "Démontrer la mobilisation des différents leviers de formation et de professionnalisation pour l'ensemble de son personnel.",
    preuves: "Plan de développement des compétences, entretien professionnel, communauté de pairs, groupe d'analyse et d'échange de pratiques.",
    obligations: "Nouveaux entrants : cet indicateur sera audité lors de l'audit de surveillance.",
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  23: {
    appreciation: "Le prestataire réalise une veille légale et réglementaire sur le champ de la formation professionnelle et en exploite les enseignements.",
    niveau: "Démontrer la mise en place d'une veille légale et réglementaire, sa prise en compte par le prestataire et sa communication en interne.",
    preuves: "Abonnements, adhésions, participation aux salons professionnels, actualisation des supports d'information en fonction des évolutions juridiques, diffusion des actualités au personnel.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par l'absence d'exploitation de la veille mise en place."
  },
  24: {
    appreciation: "Le prestataire réalise une veille sur les évolutions des compétences, des métiers et des emplois dans ses secteurs d'intervention et en exploite les enseignements.",
    niveau: "Démontrer la mise en place d'une veille sur les thèmes de l'indicateur et son impact éventuel sur les prestations.",
    preuves: "Veille et documents y afférents, participations à des conférences, adhésion à un réseau professionnel, diffusion des éléments issus de la veille au personnel, évolutions apportées au contenu des prestations.",
    obligations: "Nouveaux entrants : Démontrer la mise en place d'une veille. L'impact éventuel sera audité lors de l'audit de surveillance.",
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par l'absence d'exploitation de la veille mise en place."
  },
  25: {
    appreciation: "Le prestataire réalise une veille sur les innovations pédagogiques et technologiques permettant une évolution de ses prestations et en exploite les enseignements.",
    niveau: "Démontrer la mise en place d'une veille sur les thèmes de l'indicateur et son impact éventuel sur les prestations.",
    preuves: "Veille sur les innovations pédagogiques, participations à des conférences, groupes de réflexions et d'analyse de pratiques, diffusion des éléments au personnel, évolutions des modalités.",
    obligations: "Nouveaux entrants : démontrer la mise en place d'une veille. L'impact éventuel sera audité lors de l'audit de surveillance.",
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par l'absence d'exploitation de la veille mise en place."
  },
  26: {
    appreciation: "Le prestataire mobilise les expertises, outils et réseaux nécessaires pour accueillir, accompagner/former ou orienter les publics en situation de handicap.",
    niveau: "Démontrer l'identification d'un réseau de partenaires/experts/acteurs du champ du handicap, mobilisable par les personnels. Préciser les modalités de recours à ce réseau.",
    preuves: "Liste des partenaires du territoire (Cap emploi, MDPH...), participation aux instances, compétences actualisées du référent handicap, charte d'engagement pour l'accessibilité.",
    obligations: "Nouveaux entrants : démontrer la mise en place d'un réseau de partenaires/experts/acteurs du champ du handicap.",
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  27: {
    appreciation: "Lorsque le prestataire fait appel à la sous-traitance ou au portage salarial, il s'assure du respect de la conformité au présent référentiel.",
    niveau: "Démontrer les dispositions mises en place pour vérifier le respect de la conformité au présent référentiel par le sous-traitant ou le salarié porté.",
    preuves: "Contrats de sous-traitance, modalités de sélection et de pilotage des sous-traitants (process de sélection, animation qualité dédiée), justificatifs présentés par les sous-traitants.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  28: {
    appreciation: "Lorsque les prestations dispensées au bénéficiaire comprennent des périodes de formation en situation de travail, le prestataire mobilise son réseau de partenaires socio-économiques pour co-construire l'ingénierie de formation et favoriser l'accueil en entreprise.",
    niveau: "Démontrer l'existence d'un réseau de partenaires socio-économiques mobilisé tout au long de la prestation.",
    preuves: "Comités de pilotage, comptes rendus de réunions, liste des entreprises partenaires, conventions de partenariats, convention de formation, contacts réseau.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par un défaut ponctuel et non répétitif dans la mobilisation des partenaires."
  },
  29: {
    appreciation: "Le prestataire développe des actions qui concourent à l'insertion professionnelle ou la poursuite d'étude par la voie de l'apprentissage ou par toute autre voie permettant de développer leurs connaissances et leurs compétences.",
    niveau: "Démontrer l'existence d'actions qui concourent à l'insertion professionnelle ou à la poursuite d'études.",
    preuves: "Actions visant à favoriser l'insertion (salon d'orientation, visite d'entreprise, atelier CV, réseau d'anciens élèves), partenariats avec le monde professionnel, diffusion des offres d'emploi.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  30: {
    appreciation: "Le prestataire recueille les appréciations des parties prenantes bénéficiaires, financeurs, équipes pédagogiques et entreprises concernées.",
    niveau: "Démontrer la sollicitation des appréciations à une fréquence pertinente, incluant des dispositifs de relance et permettant une libre expression.",
    preuves: "Enquête de satisfaction, questionnaire, compte-rendu d'entretiens, évaluation à chaud et/ou à froid, analyse et traitement des appréciations, sollicitation des financeurs.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, une non-conformité mineure est caractérisée par l'absence de sollicitation des appréciations d'une partie prenante."
  },
  31: {
    appreciation: "Le prestataire met en œuvre des modalités de traitement des difficultés rencontrées par les parties prenantes, des réclamations exprimées par ces dernières, des aléas survenus en cours de prestation.",
    niveau: "Démontrer la mise en place de modalités de traitement des aléas, difficultés et réclamations.",
    preuves: "Description et mise en œuvre des modalités (accusé de réception des réclamations et réponses), traitement des difficultés et des aléas, solutions apportées, tableau de suivi.",
    obligations: null,
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  },
  32: {
    appreciation: "Le prestataire met en œuvre des mesures d'amélioration à partir de l'analyse des appréciations et des réclamations.",
    niveau: "Démontrer la mise en place d'une démarche d'amélioration continue.",
    preuves: "Identification et réflexion sur les causes d'abandon ou les motifs d'insatisfaction, plans d'action d'amélioration, mise en œuvre d'actions spécifiques, tableau de suivi des mesures.",
    obligations: "Nouveaux entrants : l'indicateur sera audité à l'audit de surveillance.",
    nonConformite: "Dans l'échantillon audité, le non-respect (même partiel) de cet indicateur entraîne une non-conformité majeure."
  }
};
