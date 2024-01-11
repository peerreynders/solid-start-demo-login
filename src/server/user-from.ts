// file: src/server/user-from.ts
import { getRequestEvent, type RequestEvent } from 'solid-js/web';

function userFromRequestEvent(event: RequestEvent) {
	if (!('user' in event.locals)) return undefined;
	const user = event.locals.user;
	return user && typeof user === 'object' ? user : undefined;
}

function userFromSession() {
	const event = getRequestEvent();
	if (!event) return undefined;
	return userFromRequestEvent(event);
}

export { userFromRequestEvent, userFromSession };
