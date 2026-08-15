import { AgentConfig } from "../../types/agent";

export type FieldDefinition = {
  key: keyof AgentConfig;
  label: string;
  multiline?: boolean;
};

export const FIELDS: FieldDefinition[] = [
  { key: "language", label: "Language" },
  { key: "transcriptionProvider", label: "Transcription Provider" },
  { key: "speechModel", label: "Speech Model" },
  { key: "ttsProvider", label: "Text-to-Speech Provider" },
  { key: "voice", label: "Voice" },
  { key: "interruptSensitivity", label: "Interruption Sensitivity" },
  { key: "welcomeGreeting", label: "Welcome Greeting" },
  { key: "prompt", label: "Prompt", multiline: true },
];

export const fieldId = (key: keyof AgentConfig) => `cr-agent-${key}`;

export const pickKnownFields = (config: AgentConfig): AgentConfig =>
  FIELDS.reduce<AgentConfig>((picked, { key }) => {
    const value = config[key];
    if (value !== undefined) picked[key] = value;
    return picked;
  }, {});

export const hasChanges = (draft: AgentConfig, saved: AgentConfig) =>
  FIELDS.some(({ key }) => (draft[key] ?? "") !== (saved[key] ?? ""));

export const isBlank = (value?: string) => (value ?? "").trim() === "";

export const missingFields = (draft: AgentConfig) =>
  FIELDS.filter(({ key }) => isBlank(draft[key]));

export const trimValues = (draft: AgentConfig): AgentConfig =>
  FIELDS.reduce<AgentConfig>((trimmed, { key }) => {
    const value = draft[key];
    if (value !== undefined) trimmed[key] = value.trim();
    return trimmed;
  }, {});
