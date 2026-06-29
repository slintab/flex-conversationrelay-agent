import "@twilio-labs/serverless-runtime-types";
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from "@twilio-labs/serverless-runtime-types/types";

type MyEvent = {
  ApplicationSid?: string;
  taskSid?: string;
  workerSid?: string;
  workspaceSid?: string;
};

type MyContext = {
  SYNC_SERVICE_SID?: string;
  TWIML_APP_SID?: string;
  CR_WEBSOCKET_URL?: string;
  TASKROUTER_WORKSPACE_SID?: string;
};

type AgentConfig = {
  hints?: string;
  interruptSensitivity?: string;
  language?: string;
  speechModel?: string;
  transcriptionProvider?: string;
  ttsProvider?: string;
  voice?: string;
  welcomeGreeting?: string;
};

export const handler: ServerlessFunctionSignature = async function (
  context: Context<MyContext>,
  event: ServerlessEventObject<MyEvent>,
  callback: ServerlessCallback,
) {
  if (event.ApplicationSid !== context.TWIML_APP_SID) {
    return callback(null, "Ignored");
  }

  const { taskSid, workerSid } = event;
  const workspaceSid = context.TASKROUTER_WORKSPACE_SID!;
  const client = context.getTwilioClient();

  const [doc, worker, task] = await Promise.all([
    client.sync.v1
      .services(context.SYNC_SERVICE_SID!)
      .documents(`agent_${workerSid}`)
      .fetch(),
    client.taskrouter.v1.workspaces(workspaceSid).workers(workerSid!).fetch(),
    client.taskrouter.v1.workspaces(workspaceSid).tasks(taskSid!).fetch(),
  ]);

  const workerAttrs = JSON.parse(worker.attributes || "{}");
  const taskAttrs = JSON.parse(task.attributes || "{}");

  const substitute = (value: string | undefined) =>
    value
      ?.replace(/\{\{worker\.(\w+)\}\}/g, (_, key) => workerAttrs[key] ?? "")
      .replace(/\{\{task\.(\w+)\}\}/g, (_, key) => taskAttrs[key] ?? "");

  const raw: AgentConfig = doc.data;
  const config: AgentConfig = {
    hints: substitute(raw.hints),
    interruptSensitivity: substitute(raw.interruptSensitivity),
    language: substitute(raw.language),
    speechModel: substitute(raw.speechModel),
    transcriptionProvider: substitute(raw.transcriptionProvider),
    ttsProvider: substitute(raw.ttsProvider),
    voice: substitute(raw.voice),
    welcomeGreeting: substitute(raw.welcomeGreeting),
  };

  const twiml = new Twilio.twiml.VoiceResponse();
  const connect = twiml.connect();
  connect.conversationRelay({
    url: `${context.CR_WEBSOCKET_URL}/ws/${workerSid}/${taskSid}`,
    language: config.language,
    voice: config.voice,
    interruptSensitivity: config.interruptSensitivity,
    speechModel: config.speechModel,
    transcriptionProvider: config.transcriptionProvider,
    ttsProvider: config.ttsProvider,
    welcomeGreeting: config.welcomeGreeting,
    hints: config.hints,
  });

  callback(null, twiml);
};
