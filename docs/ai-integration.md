# IA Integration

## Abstraction provider
- Interface `AIProvider` unique.
- Méthodes: `summarize`, `extract`, `classify`, `suggestProject`, `analyzeIntake`.
- Sélection du provider et du modèle via configuration runtime.

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
- Résumé de contenu.
- Extraction d’actions/décisions/risques/échéances.
- Classification.
- Suggestion de rattachement projet.
- Ingestion depuis la page principale: analyse d’un texte ou d’un document texte, détection des modules concernés, puis création directe d’entrées liées entre elles.

## Ingestion transverse
- Point d’entrée principal: dashboard.
- Entrées supportées: texte collé, documents texte, `PDF`, `DOCX`.
- Les documents sont transformés en texte côté serveur avant passage au modèle.
- L’analyse IA produit un plan de création pour les modules `Actions`, `Projets`, `Prestataires`, `Contrats`, `Budget`, `Communications`.
- Les rattachements sont créés dans le bon ordre quand ils sont détectables: prestataire -> projet -> contrat -> budget / communication -> actions.
- Si aucun module explicite n’est détecté, le fallback crée une action inbox afin de ne pas perdre l’information.

## Validation utilisateur
- Pour ce flux d’ingestion dashboard, la création est directe afin d’accélérer la capture.
- Le retour UI doit expliciter les modules ciblés et les entrées créées.
- Les autres usages IA peuvent rester en mode suggestion si le flux le nécessite.
