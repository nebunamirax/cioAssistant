# Chat Assistant Implementation Plan

## Objectif
Faire de la page principale un assistant conversationnel unique capable de:
- comprendre des demandes en langage naturel
- agir sur les modules métier
- accepter texte, documents et audio
- créer plusieurs entrées liées dans une seule interaction
- envoyer en revue manuelle quand la confiance n'est pas suffisante

## État actuel
- Le shell de chat du lot 1 est livré sur `/` avec [app/page.tsx](/Users/nebunamirax/Documents/Dev/cioAssistant/app/page.tsx) et [components/assistant/assistant-chat.tsx](/Users/nebunamirax/Documents/Dev/cioAssistant/components/assistant/assistant-chat.tsx).
- L’API conversationnelle existe sur [app/api/assistant/messages/route.ts](/Users/nebunamirax/Documents/Dev/cioAssistant/app/api/assistant/messages/route.ts).
- Le pipeline d’ingestion fait désormais une planification sémantique puis une extraction par étape dans [lib/services/ai-intake-service.ts](/Users/nebunamirax/Documents/Dev/cioAssistant/lib/services/ai-intake-service.ts).
- La revue manuelle existe sur `/ai-reviews` avec sélection de module et brouillon éditable.
- L’audio et la transcription restent hors périmètre livré à ce stade.

## Priorités produit
1. Texte saisi ou collé dans le chat.
2. Fichiers documentaires, en particulier `PDF` et `DOCX`.
3. Cas métier prioritaires:
   - projet + liste d'actions
   - contrat PDF + prestataire + actions de suivi + budget éventuel
   - synthèse de réunion + extraction d'actions/décisions
4. Audio micro et fichier audio.

## Expérience cible
- Une seule surface sur `/`:
  - fil de conversation
  - zone de saisie texte
  - bouton d'upload document
  - bouton micro
  - dépôt de fichier audio
- Chaque message assistant doit expliquer clairement:
  - ce qui a été compris
  - quelles opérations vont être exécutées
  - quelles entrées ont été créées ou préremplies
  - ce qui part en revue manuelle si nécessaire

## Découpage en lots

### Lot 1 - Shell de chat
Objectif: remplacer la zone d'ingestion home par une UI de chat.

Statut: livré

Travaux:
- créer un composant `assistant-chat`
- historique de messages local à la session
- composer texte + upload document
- réponse structurée avec statut conversationnel et opérations liées
- garder les liens vers les entrées créées

API:
- `POST /api/assistant/messages`

Critères d'acceptation:
- l'utilisateur peut envoyer un texte libre depuis la home
- le retour UI est conversationnel et lisible
- les créations multi-modules sont visibles sans quitter la home

### Lot 2 - Orchestrateur texte et documents
Objectif: fiabiliser le flux principal sur texte et PDF.

Statut: en cours

Travaux:
- unifier texte direct et texte extrait de document dans le même pipeline
- traiter `txt`, `md`, `csv`, `json`, `eml`, `pdf`, `docx`
- ajouter un vrai planner sémantique pour:
  - détecter le ou les modules
  - découper une demande complexe en étapes ordonnées
  - gérer les dépendances inter-étapes
- améliorer la normalisation serveur pour:
  - dates
  - montants
  - listes d'actions
  - titres projet/contrat

Cas obligatoires:
- texte projet + plusieurs actions
- texte simple action avec échéance
- PDF contrat avec extraction partielle exploitable

Critères d'acceptation:
- aucune donnée explicite utile n'est perdue
- un PDF de contrat peut au minimum préremplir un brouillon contrat exploitable
- un texte multi-actions crée plusieurs actions liées au bon projet

### Lot 3 - Revue manuelle assistée
Objectif: faire de la revue un vrai fallback métier, pas un parking.

Statut: partiellement livré

Travaux:
- conserver la file `Revue IA`
- garder le premier résultat IA et le texte source
- au choix manuel du module, relancer un call IA ciblé
- afficher le statut de suggestion ciblée dans la revue
- ne valider strictement qu'au moment de la création finale

Critères d'acceptation:
- si le routage échoue mais que des dates/montants existent, ils restent récupérables
- en choisissant `Contrat`, `Projet` ou `Action`, les champs sont préremplis de façon utile

### Lot 4 - Contrats PDF
Objectif: couvrir le cas documentaire le plus important.

Statut: commencé, non stabilisé

Travaux:
- définir le prompt et le schéma cible `contract-intake`
- extraire depuis un contrat:
  - titre
  - vendor
  - startDate
  - endDate
  - contractType
  - renewalType
  - amountPlanned
  - notes
  - actions de suivi
- lier automatiquement:
  - vendor
  - contract
  - budget item si montant exploitable
  - actions si échéances ou obligations détectées

Critères d'acceptation:
- un PDF de contrat standard ne finit pas en revue vide
- en cas d'ambiguïté, la revue contient déjà les champs contractuels clés

### Lot 5 - Audio et réunions
Objectif: permettre transcription puis synthèse de réunion.

Statut: partiellement préparé côté UI réunion, non démarré sur la création d’actions depuis CR

Travaux:
- support upload audio
- support capture micro depuis la home
- ajout d'un service de transcription
- ajout d'un schéma de synthèse réunion:
  - summary
  - decisions[]
  - actions[]
  - risks[]
  - blockers[]
  - nextSteps[]
- création ou préremplissage de `MeetingNote`, `Action`, `Communication`
- enrichir `actions[]` pour porter un responsable explicite par action
- permettre depuis l’UI réunion de transformer les actions extraites en vraies entrées `Action`
- préserver la traçabilité entre réunion source et actions créées

Critères d'acceptation:
- un fichier audio produit une transcription
- la synthèse de réunion est lisible et exploitable
- les actions détectées peuvent être créées directement ou envoyées en revue
- chaque action créée depuis un CR peut afficher un responsable explicite
- la réunion source reste retrouvable depuis l’action créée

## Backlog détaillé

### Frontend
- Remplacer [app/page.tsx](/Users/nebunamirax/Documents/Dev/cioAssistant/app/page.tsx) par une vraie vue de chat.
- Remplacer ou refondre [components/dashboard/ai-intake-panel.tsx](/Users/nebunamirax/Documents/Dev/cioAssistant/components/dashboard/ai-intake-panel.tsx).
- Ajouter:
  - composant `assistant-message-list`
  - composant `assistant-composer`
  - composant `assistant-attachment-dropzone`
  - composant `assistant-micro-button`
  - composant `assistant-operation-result`
- Prévoir un rendu spécialisé pour:
  - créations réussies
  - créations multiples
  - demandes envoyées en revue
  - transcription et synthèse de réunion
- Pour le module réunions:
  - commencer la saisie par le champ brut
  - proposer une action explicite de génération avant sauvegarde
  - afficher les actions extraites avec responsable, échéance et état de création
  - permettre de sélectionner quelles actions créer réellement

### Backend API
- Endpoint livré: `POST /api/assistant/messages`.
- Accepter `multipart/form-data` pour documents et audio.
- Retourner une structure conversationnelle stable:
  - `userMessage`
  - `assistantMessage`
  - `operations[]`
  - `created[]`
  - `reviews[]`
  - `transcript`
  - `summary`
- Préparer aussi pour les réunions:
  - un endpoint de génération de brouillon réunion depuis le brut
  - un endpoint futur de création d’actions depuis `MeetingNote`
  - un contrat de payload incluant `title`, `ownerName`, `dueDate`, `notes`, `meetingNoteId`

### Orchestration IA
- Le rôle d’orchestrateur est actuellement porté par [lib/services/ai-intake-service.ts](/Users/nebunamirax/Documents/Dev/cioAssistant/lib/services/ai-intake-service.ts).
- Étapes:
  1. normaliser l'entrée
  2. extraire le texte source
  3. lancer un call de planification sémantique
  4. extraire chaque étape séparément
  5. résoudre les dépendances et rattachements
  6. exécuter si confiance suffisante
  7. sinon envoyer en revue
- Garder la possibilité de second call ciblé par module en revue.
- Pour les réunions, prévoir un schéma d’extraction action enrichi:
  - `title`
  - `ownerName`
  - `dueDate`
  - `notes`
  - `confidence`
- Le système ne doit pas forcer un responsable inventé: si le CR ne permet pas d’identifier un porteur fiable, l’action reste sans responsable et l’UI doit le signaler.

### Modèle de données
- Conserver `AIIntakeReview`.
- Ajouter probablement:
  - `AssistantConversation`
  - `AssistantMessage`
  - optionnellement `TranscriptJob` ou réutilisation d'un job IA existant
- Stocker:
  - texte source normalisé
  - type d'entrée (`text`, `document`, `audio`)
  - nom de fichier
  - provider/model utilisés
  - résultat orchestration
- Préparation spécifique réunions / actions:
  - faire évoluer `Action` pour porter un responsable explicite
  - trancher entre relation directe `Action.meetingNoteId` et table dédiée de brouillons d’actions de réunion
  - documenter le schéma Prisma avant migration

## Besoin complémentaire - Création d'actions depuis les comptes-rendus

### Besoin produit
- Depuis une réunion saisie ou synthétisée, l’utilisateur doit pouvoir transformer les actions extraites en vraies entrées `Action` sans ressaisie.
- Chaque action issue d’un compte-rendu doit pouvoir afficher:
  - un intitulé clair
  - un responsable explicite quand il est identifiable
  - une échéance si elle est mentionnée
  - un lien de traçabilité vers la réunion source
- Le flux ne doit pas créer automatiquement des actions douteuses ou attribuées arbitrairement au mauvais responsable.

### Travail préparatoire de dev à finaliser dans la doc avant code
1. Trancher le modèle de responsabilité:
   - champ texte léger `ownerName` / `assigneeName`
   - ou vraie relation future vers `User` si la roadmap multi-utilisateur l’exige plus tôt
2. Trancher le modèle de traçabilité:
   - relation directe `Action.meetingNoteId`
   - ou table `MeetingActionDraft` / `MeetingActionLink`
3. Définir le contrat d’extraction réunion:
   - `title`
   - `ownerName`
   - `dueDate`
   - `notes`
   - `confidence`
4. Définir le workflow UX:
   - génération depuis le brut
   - revue des actions extraites
   - sélection des actions à créer
   - création unitaire ou en lot
5. Préparer les migrations et impacts:
   - Prisma
   - validation Zod
   - services `meeting-note` et `action`
   - affichage du responsable dans le module actions

### Ordre recommandé pour le futur dev
1. Migration Prisma pour le responsable et la traçabilité réunion -> action
2. Mise à jour des schémas Zod `Action`
3. Extension du draft réunion pour extraire des actions structurées avec responsable
4. Endpoint de création d’actions depuis réunion
5. UI de revue / sélection / création depuis `/meetings`
6. Vérification bout en bout via tests service + UI

### Intégration transcription
- Définir une abstraction `TranscriptionProvider`.
- Entrées:
  - blob micro
  - fichier audio
- Sorties:
  - transcript brut
  - langue détectée
  - segments optionnels

## Ordre recommandé d'implémentation
1. Lot 1
2. Lot 2
3. Lot 3
4. Lot 4
5. Lot 5

## Risques
- Le provider compatible peut être bon en classification mais faible en JSON strict.
- Les PDF de contrats peuvent exiger OCR ou extraction de texte plus robuste.
- L'audio introduit un deuxième provider potentiel distinct du provider LLM.
- Les tool calls multiples doivent rester idempotents et traçables.

## Décisions de conception
- Ne pas forcer une création automatique si le routage est douteux.
- Préférer la conservation de l'information et un brouillon riche à une création erronée.
- Faire du texte et du PDF le chemin critique du produit.
- Traiter l'audio comme une extension naturelle, mais pas comme le premier parcours à stabiliser.

## Définition de done
- La home fonctionne comme assistant de chat.
- Le texte libre et les PDF créent ou préremplissent correctement les bons modules.
- Le cas `contrat PDF` est couvert proprement.
- Le cas `projet + liste d'actions` est couvert proprement.
- La revue manuelle assistée reste utile et préremplie.
- L'audio permet transcription puis synthèse de réunion exploitable.

## Lecture produit
- Les trois premières lignes ci-dessus sont déjà en bonne voie.
- Le point `contrat PDF` est encore fragile selon le provider utilisé.
- Le point audio reste une cible produit, pas un acquis du code actuel.
