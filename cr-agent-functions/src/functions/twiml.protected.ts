import "@twilio-labs/serverless-runtime-types";
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from "@twilio-labs/serverless-runtime-types/types";

const { createError, createResponse, createTwiml } = require(
  Runtime.getFunctions()["common/utils"].path,
);

type TwilioClient = ReturnType<Context["getTwilioClient"]>;

type MyEvent = {
  ApplicationSid?: string;
  taskSid?: string;
  workerSid?: string;
};

type MyContext = {
  SYNC_SERVICE_SID?: string;
  TWIML_APP_SID?: string;
  CR_WEBSOCKET_URL?: string;
  TASKROUTER_WORKSPACE_SID?: string;
};

type AgentConfig = {
  interruptSensitivity?: string;
  language?: string;
  speechModel?: string;
  transcriptionProvider?: string;
  ttsProvider?: string;
  voice?: string;
  welcomeGreeting?: string;
};

async function fetchAgentConfig(
  client: TwilioClient,
  syncServiceSid: string,
  workerSid: string,
): Promise<AgentConfig | null> {
  try {
    const doc = await client.sync.v1
      .services(syncServiceSid)
      .documents(`agent_${workerSid}`)
      .fetch();

    return doc.data as AgentConfig;
  } catch (err) {
    console.error(`No agent configuration for ${workerSid}: `, err);
    return null;
  }
}

async function fetchAgentContext(
  client: TwilioClient,
  syncServiceSid: string,
  workspaceSid: string,
  workerSid: string,
  taskSid: string,
) {
  const [raw, worker, task] = await Promise.all([
    fetchAgentConfig(client, syncServiceSid, workerSid),
    client.taskrouter.v1.workspaces(workspaceSid).workers(workerSid).fetch(),
    client.taskrouter.v1.workspaces(workspaceSid).tasks(taskSid).fetch(),
  ]);

  return {
    raw,
    workerAttrs: JSON.parse(worker.attributes || "{}"),
    taskAttrs: JSON.parse(task.attributes || "{}"),
  };
}

function resolveConfig(
  raw: AgentConfig,
  workerAttrs: Record<string, string>,
  taskAttrs: Record<string, string>,
): AgentConfig {
  const substitute = (value: string | undefined) =>
    value
      ?.replace(/\{\{worker\.(\w+)\}\}/g, (_, key) => workerAttrs[key] ?? "")
      .replace(/\{\{task\.(\w+)\}\}/g, (_, key) => taskAttrs[key] ?? "");

  return {
    interruptSensitivity: substitute(raw.interruptSensitivity),
    language: substitute(raw.language),
    speechModel: substitute(raw.speechModel),
    transcriptionProvider: substitute(raw.transcriptionProvider),
    ttsProvider: substitute(raw.ttsProvider),
    voice: substitute(raw.voice),
    welcomeGreeting: substitute(raw.welcomeGreeting),
  };
}

function buildTwiml(config: AgentConfig, url: string) {
  const twiml = new Twilio.twiml.VoiceResponse();

  // Pause to let customer join conference
  twiml.pause({
    length: 5,
  });

  const connect = twiml.connect();

  connect.conversationRelay({
    url,
    language: config.language,
    voice: config.voice,
    interruptSensitivity: config.interruptSensitivity,
    speechModel: config.speechModel,
    transcriptionProvider: config.transcriptionProvider,
    ttsProvider: config.ttsProvider,
    welcomeGreeting: config.welcomeGreeting,
  });

  return twiml;
}

export const handler: ServerlessFunctionSignature = async function (
  context: Context<MyContext>,
  event: ServerlessEventObject<MyEvent>,
  callback: ServerlessCallback,
) {
  const { ApplicationSid, taskSid, workerSid } = event;
  const {
    SYNC_SERVICE_SID,
    TWIML_APP_SID,
    CR_WEBSOCKET_URL,
    TASKROUTER_WORKSPACE_SID,
  } = context;

  if (ApplicationSid !== TWIML_APP_SID) {
    return createError(Error("Bad request"), 400, callback);
  }

  if (!(taskSid && workerSid)) {
    return createError(Error("Missing parameters"), 400, callback);
  }

  if (!(SYNC_SERVICE_SID && CR_WEBSOCKET_URL && TASKROUTER_WORKSPACE_SID)) {
    return createError(Error("Internal error"), 500, callback);
  }

  try {
    const client = context.getTwilioClient();
    const { raw, workerAttrs, taskAttrs } = await fetchAgentContext(
      client,
      SYNC_SERVICE_SID,
      TASKROUTER_WORKSPACE_SID,
      workerSid,
      taskSid,
    );

    if (!raw) {
      return createError(Error("Missing agent configuration"), 500, callback);
    }

    const config = resolveConfig(raw, workerAttrs, taskAttrs);
    const url = `${CR_WEBSOCKET_URL}/ws/${workerSid}/${taskSid}`;

    return createTwiml(buildTwiml(config, url), callback);
  } catch (err) {
    return createError(Error("Internal error"), 500, callback);
  }
};
