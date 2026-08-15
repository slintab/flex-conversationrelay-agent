import twilio, { Twilio } from 'twilio';
import type { AgentConfig } from '../types/agent';

export function validateSignature(request: Request): boolean {
	const authToken = process.env.TWILIO_AUTH_TOKEN;
	if (!authToken) {
		return false;
	}

	const headers = request.headers;
	const twilioSignature = headers.get('x-twilio-signature');

	if (!twilioSignature) {
		return false;
	}

	const upgrade = headers.get('upgrade');
	const url = new URL(request.url);
	const requestUrl = upgrade === 'websocket' ? 'wss://' + url.hostname + url.pathname + url.search : url.href;

	return twilio.validateRequest(authToken, twilioSignature, requestUrl, {});
}

export async function fetchAgentConfiguration(name: string): Promise<AgentConfig | null> {
	const accountSid = process.env.TWILIO_ACCOUNT_SID;
	const authToken = process.env.TWILIO_AUTH_TOKEN;
	const syncServiceSid = process.env.TWILIO_SYNC_SERVICE_SID;

	if (!(accountSid && authToken && syncServiceSid)) {
		return null;
	}

	try {
		const client = twilio(accountSid, authToken);
		const document = client.sync.v1.services(syncServiceSid!).documents(`agent_${name}`).fetch();

		return (await document).data;
	} catch (error) {
		console.error('Error fetching agent configuration:', error);
		return null;
	}
}

export function getTwilioClient(): Twilio | false {
	const accountSid = process.env.TWILIO_ACCOUNT_SID;
	const authToken = process.env.TWILIO_AUTH_TOKEN;

	if (!(accountSid && authToken)) {
		console.error('Missing environment variables.');
		return false;
	}
	try {
		return twilio(accountSid, authToken);
	} catch (error) {
		return false;
	}
}

export async function fetchTaskAttributes(client: Twilio, taskSid: string): Promise<Record<string, any> | false> {
	const workspaceSid = process.env.TWILIO_TASKROUTER_WORKSPACE_SID;

	if (!(client && workspaceSid)) {
		console.error('Missing environment variables.');
		return false;
	}

	if (!taskSid) {
		console.error('Missing required parameters.');
		return false;
	}

	try {
		const task = await client.taskrouter.v1.workspaces(workspaceSid).tasks(taskSid).fetch();
		return JSON.parse(task.attributes);
	} catch (error) {
		return false;
	}
}

export function substituteAttributes(
	value: string,
	workerAttrs: Record<string, any> | false,
	taskAttrs: Record<string, any> | false,
): string {
	return value
		.replace(/\{\{worker\.(\w+)\}\}/g, (_, key) => (workerAttrs && workerAttrs[key]) ?? '')
		.replace(/\{\{task\.(\w+)\}\}/g, (_, key) => (taskAttrs && taskAttrs[key]) ?? '');
}

export async function resolvePrompt(workerSid: string, taskSid: string, rawPrompt: string): Promise<string | false> {
	const client = getTwilioClient();
	if (!client) return false;

	const [workerAttrs, taskAttrs] = await Promise.all([fetchWorkerAttributes(client, workerSid), fetchTaskAttributes(client, taskSid)]);

	return substituteAttributes(rawPrompt, workerAttrs, taskAttrs);
}

export async function fetchWorkerAttributes(client: Twilio, workerSid: string): Promise<Record<string, any> | false> {
	const workspaceSid = process.env.TWILIO_TASKROUTER_WORKSPACE_SID;

	if (!(client && workspaceSid)) {
		console.error('Missing environment variables.');
		return false;
	}

	if (!workerSid) {
		console.error('Missing required parameters.');
		return false;
	}

	try {
		const worker = await client.taskrouter.v1.workspaces(workspaceSid).workers(workerSid).fetch();
		return JSON.parse(worker.attributes);
	} catch (error) {
		return false;
	}
}
