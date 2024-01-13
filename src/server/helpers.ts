// file: src/server/helpers.ts
import { type RequestEvent } from 'solid-js/web';

function userFromRequestEvent(event: RequestEvent) {
	if (!('user' in event.locals)) return undefined;
	const user = event.locals.user;
	return user && typeof user === 'object' ? user : undefined;
}

export { userFromRequestEvent };
