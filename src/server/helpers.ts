// file: src/server/helpers.ts
import { sessionFromEvent } from './session';
import { selectUserById } from './repo';
import { userFromRequestEvent, userFromSession } from './user-from';

import type { FetchEvent } from '@solidjs/start/server';
import type { User } from './types';

// TODO: review use of userFromFetch logic
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
	const user = userFromRequestEvent(event);
	if (user) return user;

	return Promise.all([event, sessionFromEvent(event)])
		.then(queryUser)
		.then(cacheUser);
}

export { userFromFetchEvent, userFromRequestEvent, userFromSession };
