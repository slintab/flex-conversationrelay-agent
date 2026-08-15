import * as React from "react";
import * as Flex from "@twilio/flex-ui";

import { ConversationRelaySection } from "./ConversationRelaySection";

export const addConversationRelaySection = (flex: typeof Flex) => {
  flex.WorkerCanvas.Content.add(
    <ConversationRelaySection key="conversation-relay" />,
    {
      if: (props) => props.worker?.attributes?._conversationRelayAgent === true,
    },
  );
};
