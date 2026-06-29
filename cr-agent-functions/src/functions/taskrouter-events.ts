import "@twilio-labs/serverless-runtime-types";
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from "@twilio-labs/serverless-runtime-types/types";

type MyEvent = {
  EventType?: string;
  WorkerAttributes?: string;
  WorkspaceSid?: string;
  TaskSid?: string;
  WorkerSid?: string;
  ReservationSid?: string;
};

type MyContext = {
  FLEX_NUMBER?: string;
  TWIML_APP_SID?: string;
};

export const handler: ServerlessFunctionSignature = async function (
  context: Context<MyContext>,
  event: ServerlessEventObject<MyEvent>,
  callback: ServerlessCallback,
) {
  const { EventType } = event;

  if (EventType !== "reservation.created" && EventType !== "task.wrapup") {
    return callback(null, "Event ignored");
  }

  const workerAttributes = JSON.parse(event.WorkerAttributes || "{}");
  if (!workerAttributes._conversationRelayAgent) {
    return callback(null, "Worker is not a conversation relay agent");
  }

  const client = context.getTwilioClient();

  try {
    if (EventType === "reservation.created") {
      await client.taskrouter.v1
        .workspaces(event.WorkspaceSid!)
        .tasks(event.TaskSid!)
        .reservations(event.ReservationSid!)
        .update({
          instruction: "conference",
          from: context.FLEX_NUMBER,
          to: `app:${context.TWIML_APP_SID}?taskSid=${event.TaskSid}&workerSid=${event.WorkerSid}`,
          endConferenceOnCustomerExit: true,
        });
      return callback(null, "Reservation accepted with conference");
    }

    if (EventType === "task.wrapup") {
      await client.taskrouter.v1
        .workspaces(event.WorkspaceSid!)
        .tasks(event.TaskSid!)
        .update({ assignmentStatus: "completed" });
      return callback(null, "Task completed");
    }
  } catch (err) {
    console.log(err);
    callback(err as Error);
  }
};
