declare global {
	namespace NodeJS {
		interface ProcessEnv {
			TWILIO_AUTH_TOKEN?: string;
			TWILIO_ACCOUNT_SID?: string;
			TWILIO_SYNC_SERVICE_SID?: string;
			TWILIO_TASKROUTER_WORKSPACE_SID?: string;
			LLM_PROVIDER?: string;
			LLM_MODEL?: string;
		}
	}
}

export {};
