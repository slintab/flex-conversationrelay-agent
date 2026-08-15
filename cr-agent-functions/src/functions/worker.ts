import "@twilio-labs/serverless-runtime-types";
import { Twilio as ITwilio } from "twilio";
import {
  HandlerFn,
  Callback,
  functionValidator as TokenValidator,
} from "twilio-flex-token-validator";

const { createResponse, createError } = require(
  Runtime.getFunctions()["common/utils"].path,
);

type AgentConfig = {};

type MyEvent = {
  Token: string;
  TokenResult?: object;
  action?: "update" | "fetch";
  agentConfig?: AgentConfig;
  workerSid?: string;
};

type MyContext = {
  ACCOUNT_SID: string;
  AUTH_TOKEN: string;
  SYNC_SERVICE_SID?: string;
  getTwilioClient?: () => ITwilio;
};

async function fetchAgentConfig(
  client: ITwilio,
  syncServiceSid: string,
  workerSid: string,
): Promise<AgentConfig | null> {
  try {
    const document = await client.sync.v1
      .services(syncServiceSid)
      .documents(`agent_${workerSid}`)
      .fetch();

    return document.data as AgentConfig;
  } catch (err) {
    if ((err as { status?: number })?.status !== 404) throw err;
    return null;
  }
}

async function saveAgentConfig(
  client: ITwilio,
  syncServiceSid: string,
  workerSid: string,
  agentConfig: AgentConfig,
) {
  const uniqueName = `agent_${workerSid}`;

  try {
    await client.sync.v1
      .services(syncServiceSid)
      .documents(uniqueName)
      .update({ data: agentConfig });
  } catch (err) {
    if ((err as { status?: number })?.status !== 404) throw err;

    await client.sync.v1
      .services(syncServiceSid)
      .documents.create({ uniqueName, data: agentConfig });
  }
}

export const handler: HandlerFn = TokenValidator(async function (
  context: MyContext,
  event: MyEvent,
  callback: Callback,
) {
  const { action, agentConfig, workerSid } = event;
  const { SYNC_SERVICE_SID, getTwilioClient } = context;

  if (!(SYNC_SERVICE_SID && getTwilioClient)) {
    return createError(Error("Internal error"), 500, callback);
  }

  const client = getTwilioClient();

  try {
    if (action === "fetch") {
      if (!workerSid) {
        return createError(Error("Missing parameters"), 400, callback);
      }

      const config = await fetchAgentConfig(
        client,
        SYNC_SERVICE_SID,
        workerSid,
      );
      return createResponse({ workerSid, agentConfig: config }, callback);
    }

    if (action === "update") {
      if (!(workerSid && agentConfig)) {
        return createError(Error("Missing parameters"), 400, callback);
      }

      await saveAgentConfig(client, SYNC_SERVICE_SID, workerSid, agentConfig);
      return createResponse({ workerSid }, callback);
    }

    return createError(Error("Bad request."), 400, callback);
  } catch (err) {
    return createError(Error("Internal error"), 500, callback);
  }
});
