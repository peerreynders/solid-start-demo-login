import type { FetchEvent } from 'solid-start/server';

const userFromFetchEvent = (event: FetchEvent) =>
	'user' in event.locals && typeof event.locals.user === 'object'
		? (event.locals.user as User | undefined)
		: undefined;

export {
	userFromFetchEvent
};
