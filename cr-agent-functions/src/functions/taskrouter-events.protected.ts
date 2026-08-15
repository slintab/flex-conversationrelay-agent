import "@twilio-labs/serverless-runtime-types";
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
  ServerlessEventObject,
} from "@twilio-labs/serverless-runtime-types/types";

const { createError, createResponse } = require(
  Runtime.getFunctions()["common/utils"].path,
);

type TwilioClient = ReturnType<Context["getTwilioClient"]>;

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
  SYNC_SERVICE_SID?: string;
};

async function acceptReservation(
  client: TwilioClient,
  workspaceSid: string,
  taskSid: string,
  reservationSid: string,
  workerSid: string,
  from: string,
  twimlAppSid: string,
) {
  await client.taskrouter.v1
    .workspaces(workspaceSid)
    .tasks(taskSid)
    .reservations(reservationSid)
    .update({
      instruction: "conference",
      from,
      to: `app:${twimlAppSid}?taskSid=${taskSid}&workerSid=${workerSid}`,
      endConferenceOnCustomerExit: true,
    });
}

async function rejectReservation(
  client: TwilioClient,
  workspaceSid: string,
  taskSid: string,
  reservationSid: string,
) {
  await client.taskrouter.v1
    .workspaces(workspaceSid)
    .tasks(taskSid)
    .reservations(reservationSid)
    .update({ reservationStatus: "rejected" });
}

async function completeTask(
  client: TwilioClient,
  workspaceSid: string,
  taskSid: string,
) {
  await client.taskrouter.v1
    .workspaces(workspaceSid)
    .tasks(taskSid)
    .update({ assignmentStatus: "completed" });
}

export const handler: ServerlessFunctionSignature = async function (
  context: Context<MyContext>,
  event: ServerlessEventObject<MyEvent>,
  callback: ServerlessCallback,
) {
  const {
    EventType,
    WorkerAttributes,
    WorkspaceSid,
    TaskSid,
    WorkerSid,
    ReservationSid,
  } = event;
  const { FLEX_NUMBER, TWIML_APP_SID, SYNC_SERVICE_SID } = context;

  if (EventType !== "reservation.created" && EventType !== "task.wrapup") {
    return createResponse("Event ignored", callback);
  }

  const workerAttributes = JSON.parse(WorkerAttributes || "{}");
  if (!workerAttributes._conversationRelayAgent) {
    return createResponse("Worker is not a conversation relay agent", callback);
  }

  if (!(WorkspaceSid && TaskSid)) {
    return createError(Error("Missing parameters"), 400, callback);
  }

  try {
    const client = context.getTwilioClient();

    if (EventType === "task.wrapup") {
      await completeTask(client, WorkspaceSid, TaskSid);
      return createResponse("Task completed", callback);
    }

    if (!(WorkerSid && ReservationSid)) {
      return createError(Error("Missing parameters"), 400, callback);
    }

    if (!(FLEX_NUMBER && TWIML_APP_SID && SYNC_SERVICE_SID)) {
      return createError(Error("Internal error"), 500, callback);
    }

    await acceptReservation(
      client,
      WorkspaceSid,
      TaskSid,
      ReservationSid,
      WorkerSid,
      FLEX_NUMBER,
      TWIML_APP_SID,
    );

    return createResponse("Reservation accepted with conference", callback);
  } catch (err) {
    return createError(Error("Internal error"), 500, callback);
  }
};
