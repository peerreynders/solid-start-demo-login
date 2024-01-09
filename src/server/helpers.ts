import type { FetchEvent } from '@solidjs/start/server';
import { sessionFromEvent } from './session';
import { selectUserById } from './repo';
import type { User } from './types';

type SessionType = Awaited<ReturnType<typeof sessionFromEvent>>;

function queryUser([event, session]: [FetchEvent, SessionType]) {
	const { userId } = session.data;
	if (!userId) return;

	return Promise.all([event, selectUserById(userId)]);
}

function cacheUser(context: [FetchEvent, User | undefined] | undefined) {
	if (!context) return;

	// Note: `user` may be `undefined` but we set `locals.user`
	// to `undefined` to cache that we checked.
	const [event, user] = context;
	event.locals.user = user;
	return user;
}

function userFromFetchEvent(event: FetchEvent) {
	if ('user' in event.locals) {
		// If `user` is already set to `undefined` we've
		// already tried before and didn't find anything
		return typeof event.locals.user === 'object'
			? (event.locals.user as User)
			: undefined;
	}

	return Promise.all([event, sessionFromEvent(event)])
		.then(queryUser)
		.then(cacheUser);
}

export { userFromFetchEvent };
