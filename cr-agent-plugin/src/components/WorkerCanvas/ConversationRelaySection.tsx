import * as React from "react";
import { IWorker } from "@twilio/flex-ui";
import { Box } from "@twilio-paste/core/box";
import { Text } from "@twilio-paste/core/text";
import { SkeletonLoader } from "@twilio-paste/core/skeleton-loader";

import { useAgentConfig } from "../../hooks/useAgentConfig";
import { AgentConfigForm } from "./AgentConfigForm";
import { SectionHeading } from "./SectionHeading";

type Props = {
  worker?: IWorker;
};

const Loading = () => (
  <Box
    paddingX="space50"
    paddingY="space30"
    display="flex"
    flexDirection="column"
    rowGap="space30"
  >
    <SkeletonLoader height="sizeSquare40" />
    <SkeletonLoader height="sizeSquare40" />
    <SkeletonLoader height="sizeSquare40" />
  </Box>
);

const LoadError = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    paddingX="space50"
    paddingY="space30"
  >
    <Text as="p" fontSize="fontSize30" lineHeight="lineHeight30">
      Could not load configuration
    </Text>
  </Box>
);

export const ConversationRelaySection = ({ worker }: Props) => {
  const { config, isLoading, error, setConfig } = useAgentConfig(worker?.sid);

  return (
    <Box flexShrink={0}>
      <SectionHeading>ConversationRelay</SectionHeading>
      {isLoading && <Loading />}
      {!isLoading && error && <LoadError />}
      {!isLoading && !error && worker && (
        <AgentConfigForm
          key={worker.sid}
          workerSid={worker.sid}
          config={config}
          onSaved={setConfig}
        />
      )}
    </Box>
  );
};
