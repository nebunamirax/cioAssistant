import { z } from "zod";

export const appSettingsSchema = z.object({
  ai: z.object({
    providerMode: z.enum(["local", "openai", "compatible"]).default("compatible"),
    localModel: z.string().default("heuristic-v1"),
    localModels: z.string().default("heuristic-v1"),
    openAIApiKey: z.string().default(""),
    openAIModel: z.string().default(""),
    openAIModels: z.string().default(""),
    compatibleBaseUrl: z.string().default("http://host.docker.internal:1234/v1"),
    compatibleApiKey: z.string().default(""),
    compatibleModel: z.string().default("mistralai/devstral-small-2507"),
    compatibleModels: z.string().default("mistralai/devstral-small-2507")
  }).default({}),
  integrations: z.object({
    outlookEnabled: z.boolean().default(false),
    outlookTenantId: z.string().default(""),
    outlookClientId: z.string().default(""),
    outlookClientSecret: z.string().default(""),
    outlookPollingEnabled: z.boolean().default(false),
    outlookPollingIntervalMinutes: z.coerce.number().int().min(1).max(1440).default(15),
    outlookAutomationEnabled: z.boolean().default(false),
    outlookAutomationCategory: z.string().default("assistant"),
    notionEnabled: z.boolean().default(false),
    notionApiKey: z.string().default(""),
    notionDatabaseId: z.string().default("")
  }).default({})
});

export const appSettingsUpdateSchema = appSettingsSchema;

export type AppSettings = z.infer<typeof appSettingsSchema>;
