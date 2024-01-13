import {
	createMiddleware,
	getCookie,
	getRequestHeaders,
	sendRedirect,
} from '@solidjs/start/server';
import {
	sessionFromEvent,
	sessionUserId,
	USER_SESSION_NAME,
} from './server/session';
import { isAllowedFnName } from './api';
import { signOut } from './api/server';
import { selectUserById } from './server/repo';
import { homeHref, loginHref, logoutHref, pathAbsolute } from './route-path';

import type { RequestEvent } from 'solid-js/web';
import type { RequestHeaders } from 'h3';

function isAllowedFn(headers: RequestHeaders) {
	// leverage vinxi header
	const serverFnId = headers['x-server-id'];
	if (!serverFnId) return false;

	const fragmentAt = serverFnId.lastIndexOf('#');
	if (fragmentAt < 0) return false;

	const fnName = serverFnId.slice(fragmentAt + 1);
	return isAllowedFnName(fnName);
}

async function redirectWhenNotAuthenticated(event: RequestEvent) {
	const login = loginHref();
	const url = new URL(event.request.url);
	const route = url.pathname;
	if (route === logoutHref) {
		// Perform logout and goto login screen
		await signOut(event);
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

	let headers: RequestHeaders | undefined;
	const getHeaders = () => (headers ? headers : getRequestHeaders(event));

	if (route === '/_server') {
		if (isAllowedFn(getHeaders())) return;

		return sendRedirect(event, login);
	}

	// need to authenticate
	if (route !== login) return sendRedirect(event, loginHref(pathAbsolute(url)));
}

export default createMiddleware({
	onRequest: [redirectWhenNotAuthenticated],
	onBeforeResponse: [],
});
