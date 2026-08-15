import * as Flex from "@twilio/flex-ui";
import { FlexPlugin } from "@twilio/flex-plugin";
import { CustomizationProvider } from "@twilio-paste/core/customization";

import { addConversationRelaySection } from "./components/WorkerCanvas/addConversationRelaySection";

const PLUGIN_NAME = "CrAgentPlugin";

export default class CrAgentPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  async init(flex: typeof Flex, manager: Flex.Manager): Promise<void> {
    flex.setProviders({ PasteThemeProvider: CustomizationProvider });

    const isAdminOrSupervisor =
      manager.user.roles.includes("admin") ||
      manager.user.roles.includes("supervisor");

    if (isAdminOrSupervisor) {
      addConversationRelaySection(flex);
    }
  }
}
