import { AutoRouter } from 'itty-router';
import { agentHandler, twilioAuthHandler } from './handlers';

const router = AutoRouter();

router.all('*', twilioAuthHandler);
router.get('/ws/:workerSid/:taskSid', agentHandler);

export default { ...router };
