import { createMiddleware, type FetchEvent } from '@solidjs/start/server';
import { getSession } from './server/session';
import { selectUserById } from './server/repo';

async function attachUser(event: FetchEvent) {
	console.log('attachUser');
	const session = await getSession(event);
	const { userId } = session.data;
	if (userId) {
		const user = await selectUserById(userId);
		if (user) event.locals.user = user;
	}
}

export default createMiddleware({
	onRequest: [attachUser],
	onBeforeResponse: [],
});
