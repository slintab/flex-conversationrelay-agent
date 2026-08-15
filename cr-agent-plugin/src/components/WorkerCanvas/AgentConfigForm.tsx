import * as React from "react";
import { Button as FlexButton } from "@twilio/flex-ui";
import { Box } from "@twilio-paste/core/box";
import { Text } from "@twilio-paste/core/text";
import { Alert } from "@twilio-paste/core/alert";

import AgentService from "../../services/AgentService";
import { AgentConfig } from "../../types/agent";
import { AgentConfigField } from "./AgentConfigField";
import {
  FIELDS,
  hasChanges,
  isBlank,
  missingFields,
  pickKnownFields,
  trimValues,
} from "./agentFields";

type Props = {
  workerSid: string;
  config: AgentConfig | null;
  onSaved: (config: AgentConfig) => void;
};

export const AgentConfigForm = ({ workerSid, config, onSaved }: Props) => {
  const [draft, setDraft] = React.useState(() => pickKnownFields(config ?? {}));
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState<
    Partial<Record<keyof AgentConfig, boolean>>
  >({});

  const save = async () => {
    if (missingFields(draft).length > 0) {
      setTouched(Object.fromEntries(FIELDS.map(({ key }) => [key, true])));
      setError("Please complete all required fields before saving.");
      return;
    }

    const trimmed = trimValues(draft);

    setIsSaving(true);
    setError(null);

    try {
      await AgentService.updateAgentConfig(workerSid, trimmed);
      setDraft(trimmed);
      onSaved(trimmed);
    } catch (e) {
      console.error(`Error saving agent configuration: ${e}`);
      setError("Could not save the configuration. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Box
        paddingX="space50"
        paddingY="space30"
        display="flex"
        flexDirection="column"
        rowGap="space30"
      >
        {FIELDS.map((field) => (
          <AgentConfigField
            key={field.key}
            field={field}
            value={draft[field.key] ?? ""}
            disabled={isSaving}
            errorText={
              touched[field.key] && isBlank(draft[field.key])
                ? `${field.label} is required`
                : undefined
            }
            onChange={(value) => {
              setDraft((current) => ({ ...current, [field.key]: value }));
              setError(null);
            }}
            onBlur={() =>
              setTouched((current) => ({ ...current, [field.key]: true }))
            }
          />
        ))}
      </Box>

      {error && (
        <Box paddingX="space50" paddingBottom="space30">
          <Alert variant="error">
            <Text as="span">{error}</Text>
          </Alert>
        </Box>
      )}

      <Box padding="space50" display="flex" justifyContent="flex-end">
        <FlexButton
          variant="primary"
          disabled={isSaving || !hasChanges(draft, config ?? {})}
          onClick={save}
        >
          {isSaving ? "Saving…" : "Save"}
        </FlexButton>
      </Box>
    </>
  );
};
