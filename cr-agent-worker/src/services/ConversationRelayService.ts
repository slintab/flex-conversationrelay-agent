import { LLMService } from './LLMService';

export interface ConversationRelayMessage {
	type: 'prompt' | 'interrupt' | 'error';
	voicePrompt?: string;
}

export class ConversationRelayService {
	ws: WebSocket;
	llm: LLMService;

	constructor(ws: WebSocket, llm: LLMService) {
		this.ws = ws;
		this.llm = llm;
		this.llm.on('response', this.handleResponse.bind(this));
	}

	handleResponse(message: { content: any; last: any }) {
		const response = {
			type: 'text',
			token: message.content,
			last: message.last,
		};

		this.ws.send(JSON.stringify(response));
	}

	async processMessage(message: ConversationRelayMessage) {
		if (message.type === 'prompt') {
			await this.llm.createResponse(message.voicePrompt!);
		}

		if (message.type === 'interrupt') {
			this.llm.interrupt();
		}

		if (message.type === 'error') {
			// handle errors
		}
	}
}
