import * as React from "react";
import { Box } from "@twilio-paste/core/box";
import { Text } from "@twilio-paste/core/text";

export const SectionHeading = ({ children }: { children: string }) => (
  <Box
    className="Twilio-WorkerCanvas-SectionHeader"
    marginTop="space60"
    marginX="space50"
    marginBottom="space30"
    paddingY="space30"
    borderBottomWidth="borderWidth10"
    borderBottomStyle="solid"
    borderBottomColor="colorBorderWeak"
  >
    <Text
      as="h3"
      fontSize="fontSize30"
      fontWeight="fontWeightBold"
      lineHeight="lineHeight30"
    >
      {children}
    </Text>
  </Box>
);
