# Twilio Flex: ConversationRelay Agent

This repository contains a plugin and the supporting backend for running [ConversationRelay](https://www.twilio.com/docs/voice/conversationrelay) AI voice agents as regular TaskRouter workers in Twilio Flex. ConversationRelay agents are modeled as TaskRouter Workers, which allows existing Flex capabilities, such as reporting and real-time monitoring, to be used for AI agents in the same way they are used for human agents.

## Table of contents

- [Demo](#demo)
- [Architecture](#architecture)
- [Setup](#setup)
- [Maintainer](#maintainer)

## Demo

![Demo](demo.png?raw=true)

## Architecture

AI agents are modeled as standard TaskRouter Workers with the `_conversationRelayAgent` attribute, so they appear in Teams View and receive tasks through existing workflows and queues.

For those workers, the plugin extends the built-in [WorkerCanvas](https://assets.flex.twilio.com/docs/releases/flex-ui/2.17.1/programmable-components/components/WorkerCanvas/) component with a ConversationRelay section where supervisors can edit the agent's configuration (e.g. language, voice, prompt).

Every confuguratin field supports `{{worker.<attribute>}}` and `{{task.<attribute>}}` placeholders, which are resolved against the worker and task attributes when a call is answered.

The solution uses the following components:

- **Twilio ConversationRelay**: streams speech-to-text and text-to-speech between the caller and the AI agent over WebSocket.
- **Twilio Flex Plugin** _(cr-agent-plugin)_: adds AI agent configuration controls to the Flex UI.
- **Twilio Sync**: stores agent configuration.
- **Twilio TaskRouter**: routes calls to AI agents.
- **Twilio Functions** _(cr-agent-functions)_: provides middleware for handling reservations for CR agents, serving the `<ConversationRelay>` TwiML and interacting with Sync.
- **Cloudflare Worker** _(cr-agent-worker)_: provides middleware for streaming messages between ConversationRelay and the LLM.
  **LLM** _(OpenAI)_: generates responses.

The below diagram illustrates the call flow:

![Diagram](architecture.png?raw=true)

1. An inbound call is received on the Flex number and enqueued in TaskRouter.
2. TaskRouter creates a Task and Reservation for a ConversationRelay agent based on the configured Workflow.
3. TaskRouter emits a `reservation.created` event to the `/taskrouter-events` Twilio Function.
4. The Twilio Function processes the event and accepts the Reservation using a Conference instruction. The worker contact URI is set to a TwiML App that points to the `/twiml` Twilio Function.
5. Twilio creates a Conference for the call and dials the worker through the TwiML App.
6. The `/twiml` Twilio Function fetches the agent configuration from Sync and returns a ConversationRelay instruction that points to a Cloudflare Worker.
7. Twilio starts a ConversationRelay session and adds the worker to the Conference, followed by the caller.
8. When the caller speaks, ConversationRelay sends a voicePrompt message to the Cloudflare Worker over the WebSocket connection.
9. The Worker sends the prompt to OpenAI and returns the generated response over the ConversationRelay WebSocket, which is then played to the caller.
10. When the call ends, the Task moves to wrapping status and TaskRouter emits a `task.wrapup` event to the `/taskrouter-events` Twilio Function.
11. The Twilio Function processes the `task.wrapup` event and completes the Task.

## Setup

**Step 1: Configure Sync**:

1. Create a Sync Service under _Sync > Services_ and make a note of its SID.

**Step 2: Create a TwiML App**:

1. Create a TwiML App under _Voice > Manage > TwiML Apps_ and make a note of its SID. Leave its Voice Request URL empty for now.

**Step 3: Deploy the Cloudflare Worker**:

1. Install the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/).
2. Navigate to the worker directory: `cd cr-agent-worker`, and install dependencies with `npm install`.
3. Review the `vars` block in `wrangler.jsonc`, which selects the model used by the agents:
   - `LLM_PROVIDER`: the AI SDK provider to use (`openai`).
   - `LLM_MODEL`: the model to use (e.g. `gpt-4.1-nano`).
4. Set the secrets using `npx wrangler secret put <NAME>`:
   - `TWILIO_ACCOUNT_SID`: your Twilio account SID.
   - `TWILIO_AUTH_TOKEN`: your Twilio auth token, used to validate the ConversationRelay WebSocket signature.
   - `TWILIO_SYNC_SERVICE_SID`: SID of the Sync service from step 1.
   - `TWILIO_TASKROUTER_WORKSPACE_SID`: SID of your Flex TaskRouter workspace.
   - `OPENAI_API_KEY`: your OpenAI API key.
5. Deploy the worker using `npm run deploy`, and make a note of its URL.

**Step 4: Deploy Twilio Functions**:

1. Install the [Twilio Serverless Toolkit](https://www.twilio.com/docs/labs/serverless-toolkit).
2. Navigate to the functions directory: `cd cr-agent-functions`, and install dependencies with `npm install`.
3. Rename `.env.example` to `.env`, and set the values of environment variables as follows:
   - `ACCOUNT_SID`: your Twilio account SID.
   - `AUTH_TOKEN`: your Twilio auth token.
   - `FLEX_NUMBER`: inbound Flex phone number.
   - `TWIML_APP_SID`: SID of the TwiML App from step 2.
   - `SYNC_SERVICE_SID`: SID of the Sync service from step 1.
   - `TASKROUTER_WORKSPACE_SID`: SID of your Flex TaskRouter workspace.
   - `CR_WEBSOCKET_URL`: the WebSocket URL of the worker from step 3.
4. Deploy the functions using `npm run deploy`, and make a note of the base URL of the deployed service.

**Step 5: Configure TaskRouter and the TwiML App**:

1. Set the Voice Request URL of the TwiML App from step 2 to the URL of the `/twiml` Function from step 4.
2. Under _TaskRouter > Workspaces > Flex Task Assignment > Settings_, set the Event Callback URL to the URL of the `/taskrouter-events` Function from step 4, and make sure the `reservation.created` and `task.wrapup` events are selected.

**Step 6: Deploy Flex plugin**:

1. Install the [Flex Plugins CLI](https://www.twilio.com/docs/flex/developer/plugins/cli).
2. Navigate to the plugin directory: `cd cr-agent-plugin`, and install dependencies with `npm install`.
3. Rename `.env.example` to `.env`, and set `FLEX_APP_FUNCTIONS_URL` to the base URL of Twilio Functions from step 4.
4. Deploy the plugin using the `twilio flex:plugins:deploy` command.

**Step 7: Create an AI agent**:

1. Create a TaskRouter worker to represent an AI agent, and add `"_conversationRelayAgent": true` to its attributes.
2. Navigate to the Teams View in Flex and select your AI agent to configure it.

That's it! To see the agent in action, set the worker's activity to an available one, and place an inbound call!

## Maintainer

Thanks for reading this far!
If you have any questions, do not hesitate to reach out at `hello@slintab.dev`.
