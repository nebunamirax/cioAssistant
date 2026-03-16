# IA Integration

## Abstraction provider
- Interface `AIProvider` unique.
- Méthodes actuelles: `planIntake`, `analyzeIntake`, `suggestDraft`, `summarize`, `extract`, `classify`, `suggestProject`.
- Sélection du provider et du modèle via configuration runtime.
- Cette couche alimente déjà le chat principal sur `/` via `POST /api/assistant/messages`.

## Mode IA locale
- Provider `LocalAIProvider`.
- Retourne format standardisé.
- Sert de fallback sans dépendance externe.

## Mode OpenAI
- Provider `OpenAIProvider`.
- Utilise `Responses API` avec sortie JSON structurée pour l’ingestion transverse.

## Mode compatible
- Provider `CompatibleAIProvider`.
- Cible un endpoint `OpenAI-compatible`, utile pour des modèles locaux exposés via Ollama / LM Studio / passerelle interne.

## Types de tâches IA
- Chat opérateur en langage naturel.
- Résumé de contenu.
- Extraction d’actions, décisions, risques, échéances et champs métier.
- Classification / routage multi-modules.
- Suggestion de rattachement projet.
- Extraction ciblée d’un brouillon pour un module choisi manuellement.
- Transcription audio puis synthèse structurée.

## Assistant principal
- Point d’entrée principal: home.
- Forme UX actuelle: panneau de chat unique avec historique local, zone de saisie texte et upload document.
- Entrées actuellement supportées: texte collé, documents texte, `PDF`, `DOCX`.
- Audio micro et fichiers audio restent prévus mais ne sont pas encore implémentés dans l’UI ni dans le pipeline serveur.
- Priorité produit: le texte et les documents textuels restent le premier cas d'usage.
- Le système doit être performant sur:
  - texte libre saisi ou collé
  - emails transférés/collés
  - `PDF` métiers, notamment les contrats
- Les documents et fichiers audio doivent être transformés en texte côté serveur avant raisonnement métier.
- Le pipeline actuel fait d’abord un call de planification sémantique pour:
  - comprendre l’intention globale
  - décomposer une demande en plusieurs étapes métier
  - expliciter les dépendances entre étapes, par exemple une action qui dépend du projet créé juste avant
- Ensuite, chaque étape est extraite séparément en brouillon métier structuré avant exécution.
- Avant ce call, le serveur peut récupérer une shortlist de projets existants potentiellement pertinents.
- Cette shortlist est injectée au modèle comme contexte de travail, avec `id`, `title`, `status`, `priority`.
- Le but n’est pas un RAG lourd à base d’embeddings pour cette étape, mais un `retrieve-then-decide` pragmatique:
  - recherche serveur simple sur les projets existants
  - contexte court transmis au modèle
  - choix d’un `projectId` uniquement si le match est suffisamment clair
  - fallback revue manuelle si ambiguïté persistante
- Le système doit accepter des commandes multi-entités, par exemple un projet avec plusieurs actions associées.
- Les rattachements sont créés dans le bon ordre quand ils sont détectables: prestataire -> projet -> contrat -> budget / communication -> actions.
- Le cas actuellement pris en charge explicitement par dépendance de plan est `project_of` pour rattacher une action au projet créé dans la même demande.
- Si la confiance est suffisante, la création ou mise à jour est exécutée directement.
- Si le routage est ambigu, la demande bascule en revue manuelle.

## Rattachement projet
- Un rattachement automatique d’action vers un projet existant ne doit pas dépendre d’un nom “magique” codé en dur.
- Le flux recommandé est:
  - récupérer les meilleurs candidats projet à partir du texte entrant
  - les donner au modèle dans le contexte
  - laisser le modèle renseigner `projectId` si un candidat est clairement visé
  - compléter côté serveur par une règle de rattachement simple quand un seul projet candidat est mentionné textuellement
- Ce mécanisme couvre les cas simples rapidement sans introduire une stack vectorielle complète.
- Si le volume de projets augmente fortement ou si les formulations deviennent trop indirectes, une étape suivante pourra ajouter embeddings et recherche sémantique.

## Cas prioritaire contrats PDF
- Dépôt d'un contrat en `PDF` depuis le chat principal.
- Extraction attendue:
  - titre du contrat
  - prestataire / fournisseur
  - dates de début et de fin
  - type de contrat
  - mode de renouvellement
  - montant planifié si présent
  - échéances et actions de suivi
- Le résultat peut produire plusieurs opérations liées:
  - `create_vendor`
  - `create_contract`
  - `create_budget_item`
  - `create_action`
- Si certaines informations sont ambiguës, le contrat doit partir en revue avec les champs déjà préremplis.

## Revue manuelle assistée
- Si l’identification initiale n’est pas assez fiable, aucune création arbitraire ne doit être forcée.
- La revue manuelle doit permettre de sélectionner le module puis de relancer une extraction IA ciblée des champs du module choisi.
- Les données déjà explicites dans le texte source, comme dates ou montants, doivent rester récupérables même si le premier routage échoue.
- Cette logique doit aussi s'appliquer aux `PDF` de contrats: même si la création auto échoue, les dates, montants, fournisseur et intitulé doivent rester récupérables dans le brouillon.

## Réunions et audio
- `/meetings` accepte maintenant:
  - un fichier audio déposé depuis le poste
  - une note vocale enregistrée depuis le micro du navigateur
- Le serveur transcrit l’audio en texte avant de réinjecter le résultat dans le champ `Compte-rendu brut`.
- La synthèse réunion continue ensuite de s’appuyer sur le même pipeline que pour le texte collé.
- La transcription audio actuelle vise un fonctionnement local:
  - moteur embarqué dans l’app via binding Node `whisper.cpp`
  - `whisper.cpp` si `AI_AUDIO_TRANSCRIPTION_BACKEND=whispercpp`
  - commande locale configurable via `AI_AUDIO_TRANSCRIPTION_COMMAND`
  - ou endpoint compatible audio local via `/audio/transcriptions`
- Un modèle texte Mistral classique ne suffit pas pour cette brique; il faut soit un moteur STT dédié, soit un modèle audio-capable exposé par l’infra locale.
- Les usages cibles restent:
  - transcription brute
  - synthèse de réunion
  - extraction d’actions, décisions, risques, points bloquants et échéances
  - création ou préremplissage de notes de réunion, actions et communications de suivi
