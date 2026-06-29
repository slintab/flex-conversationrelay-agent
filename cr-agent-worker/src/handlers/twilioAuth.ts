import { IRequest } from 'itty-router';
import { validateSignature } from '../utils/twilio';

export const twilioAuthHandler = async (req: IRequest) => {
	if (!validateSignature(req)) {
		return new Response('Unauthorized', { status: 401 });
	}
};
