import EventEmitter from 'events';
import { streamText, SystemModelMessage, UserModelMessage, AssistantModelMessage, LanguageModel, Instructions } from 'ai';
import { openai } from '@ai-sdk/openai';

type Message = UserModelMessage | AssistantModelMessage;

export class LLMService extends EventEmitter {
	provider: null | LanguageModel;
	model: null | string;
	tools: string[];
	messages: Message[];
	isInterrupted: boolean;
	prompt: Instructions;

	abortController: null | AbortController;

	constructor(provider: string, model: string, prompt: string, tools: string[]) {
		super();
		this.provider = null;
		this.model = null;
		this.prompt = prompt;
		this.tools = [];
		this.messages = [];
		this.isInterrupted = false;
		this.abortController = null;

		this.setTools(tools);
		this.setProvider(provider, model);
	}

	setTools(tools: string[]) {
		this.tools = tools;
	}

	setProvider(provider: string, model: string) {
		if (provider === 'openai') {
			this.provider = openai(model);
		}
	}

	async createResponse(message: string) {
		this.abortController = new AbortController();
		this.isInterrupted = false;
		this.messages.push({ role: 'user', content: message });

		const result = streamText({
			model: this.provider!,
			messages: this.messages,
			instructions: this.prompt,
			// tools: this.tools
			abortSignal: this.abortController.signal,
			onFinish: ({ text }) => {
				if (text) this.messages.push({ role: 'assistant', content: text });
			},
			providerOptions: {
				openai: {
					store: false,
				},
			},
		});

		for await (const delta of result.textStream) {
			if (this.isInterrupted) break;
			if (delta) {
				const isEndOfSentence = /[.?!]\s*$/.test(delta);
				this.emit('response', { content: delta, last: isEndOfSentence });
			}
		}
	}

	interrupt() {
		this.isInterrupted = true;
		this.abortController?.abort();
	}
}
