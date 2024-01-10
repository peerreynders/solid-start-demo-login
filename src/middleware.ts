import { getCookie } from 'h3';
import { createMiddleware, sendRedirect } from '@solidjs/start/server';
import {
	sessionFromEvent,
	sessionUserId,
	USER_SESSION_NAME,
} from './server/session';
import { logout } from './api/server';
import { selectUserById } from './server/repo';
import { homeHref, loginHref, logoutHref, pathAbsolute } from './route-path';

import type { RequestEvent } from 'solid-js/web';

async function redirectWhenNotAuthenticated(event: RequestEvent) {
	const login = loginHref();
	const url = new URL(event.request.url);
	const route = url.pathname;
	if (route === logoutHref) {
		// Perform logout and goto login screen
		await logout(event);
		return sendRedirect(event, login);
	}

	const cookie = getCookie(event, USER_SESSION_NAME);
	if (cookie) {
		const session = await sessionFromEvent(event);
		const userId = sessionUserId(session);
		if (userId) {
			const user = await selectUserById(userId);
			if (user) {
				// AUTHENTICATED
				event.locals.user = user;
				if (route === login) return sendRedirect(event, homeHref);

				return;
			}
		}
	}

	// May need to revisit:
	if (route === '/_server') return;

	// need to authenticate
	if (route !== login) return sendRedirect(event, loginHref(pathAbsolute(url)));
}

export default createMiddleware({
	onRequest: [redirectWhenNotAuthenticated],
	onBeforeResponse: [],
});
