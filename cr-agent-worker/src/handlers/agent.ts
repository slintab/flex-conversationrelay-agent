import { IRequest } from 'itty-router';
import { fetchAgentConfiguration, resolvePrompt } from '../utils/twilio';
import { LLMService } from '../services/LLMService';
import { ConversationRelayService } from '../services/ConversationRelayService';

export const agentHandler = async (req: IRequest) => {
	const upgradeHeader = req.headers.get('Upgrade');
	if (!upgradeHeader || upgradeHeader !== 'websocket') {
		return new Response('Expected Upgrade: websocket', { status: 426 });
	}

	const { workerSid, taskSid } = req;
	if (!(workerSid && taskSid)) {
		return new Response('Missing parameters', { status: 400 });
	}

	const agentConfig = await fetchAgentConfiguration(workerSid);
	if (!agentConfig) {
		return new Response('Agent configuration not found', { status: 404 });
	}

	const prompt = await resolvePrompt(workerSid, taskSid, agentConfig.prompt);
	if (!prompt) {
		return new Response('Unable to resolve prompt', { status: 500 });
	}

	const [client, server] = Object.values(new WebSocketPair());
	server.accept();

	const llm = new LLMService(agentConfig.provider, agentConfig.model, prompt, agentConfig.tools);
	const cr = new ConversationRelayService(server, llm);

	server.addEventListener('message', (event) => {
		cr.processMessage(JSON.parse(event.data));
	});

	return new Response(null, {
		status: 101,
		webSocket: client,
	});
};
