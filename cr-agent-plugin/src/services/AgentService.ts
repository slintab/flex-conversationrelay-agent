import * as Flex from "@twilio/flex-ui";

import { AgentConfig } from "../types/agent";

const FUNCTIONS_URL = process.env.FLEX_APP_FUNCTIONS_URL;

class AgentService {
  url: string | undefined;
  manager: Flex.Manager;

  constructor() {
    this.url = FUNCTIONS_URL;
    this.manager = Flex.Manager.getInstance();
  }

  private async post(body: Record<string, unknown>): Promise<any> {
    const response = await fetch(`${this.url}/worker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Token: this.manager.user.token, ...body }),
    });

    if (!response.ok) {
      throw new Error(
        `/worker ${String(body.action)} failed with ${response.status}`,
      );
    }

    return response.json();
  }

  async fetchAgentConfig(workerSid: string): Promise<AgentConfig | null> {
    const data = await this.post({ action: "fetch", workerSid });
    return (data.agentConfig as AgentConfig) ?? null;
  }

  async updateAgentConfig(
    workerSid: string,
    config: AgentConfig,
  ): Promise<void> {
    await this.post({ action: "update", workerSid, agentConfig: config });
  }
}

export default new AgentService();
