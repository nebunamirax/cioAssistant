# IA Integration

## Abstraction provider
- Interface `AIProvider` unique.
- Méthodes: `summarize`, `extract`, `classify`, `suggestProject`.

## Mode IA locale
- Provider `LocalAIProvider`.
- Peut encapsuler moteur local futur.
- Retourne format standardisé.

## Mode IA API externe
- Provider `ExternalAIProvider`.
- Appels HTTP vers service IA configurable.

## Types de tâches IA
- Résumé de contenu.
- Extraction d’actions/décisions/risques/échéances.
- Classification.
- Suggestion de rattachement projet.

## Validation utilisateur
- Les résultats sont stockés en suggestions.
- L’utilisateur valide manuellement avant création d’entités.
