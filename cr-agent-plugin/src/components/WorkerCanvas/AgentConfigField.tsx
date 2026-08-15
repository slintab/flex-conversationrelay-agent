import * as React from "react";
import { Box } from "@twilio-paste/core/box";
import { Label } from "@twilio-paste/core/label";
import { Input } from "@twilio-paste/core/input";
import { TextArea, TextAreaProps } from "@twilio-paste/core/textarea";
import { HelpText } from "@twilio-paste/core/help-text";

import { FieldDefinition, fieldId } from "./agentFields";

const AutosizeTextArea = TextArea as React.ComponentType<
  TextAreaProps & { maxRows?: number }
>;

type Props = {
  field: FieldDefinition;
  value: string;
  disabled: boolean;
  errorText?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export const AgentConfigField = ({
  field,
  value,
  disabled,
  errorText,
  onChange,
  onBlur,
}: Props) => {
  const id = fieldId(field.key);
  const errorId = `${id}-error`;
  const shared = {
    id,
    value,
    disabled,
    onBlur,
    hasError: Boolean(errorText),
    "aria-describedby": errorText ? errorId : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.currentTarget.value),
  };

  return (
    <Box>
      <Label htmlFor={id} required>
        {field.label}
      </Label>
      {field.multiline ? (
        <AutosizeTextArea {...shared} resize="vertical" maxRows={3} />
      ) : (
        <Input {...shared} type="text" />
      )}
      {errorText && (
        <HelpText id={errorId} variant="error">
          {errorText}
        </HelpText>
      )}
    </Box>
  );
};
