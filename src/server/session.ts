import { createCookieSessionStorage } from 'solid-start';
import { redirect, type FetchEvent } from 'solid-start/server';
import { safeRedirect, userFromFetchEvent } from './helpers';
import { loginHref } from '~/route-path';
import { selectUserById } from '~/server/repo';

import type { Session } from 'solid-start/session/sessions';
import type { User } from '~/types';

if (!process.env.SESSION_SECRET) throw Error('SESSION_SECRET must be set');

const storage = createCookieSessionStorage({
	cookie: {
		name: '__session',
		secure: process.env.NODE_ENV === 'production',
		secrets: [process.env.SESSION_SECRET],
		sameSite: 'lax',
		path: '/',
		maxAge: 0,
		httpOnly: true,
	},
});

const fromRequest = (request: Request): Promise<Session> =>
	storage.getSession(request.headers.get('Cookie'));

const USER_SESSION_KEY = 'userId';
const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
// Cookies are session cookies if they do not
// specify the `Expires` or `Max-Age` attribute.

async function createUserSession({
	request,
	userId,
	remember,
	redirectTo,
}: {
	request: Request;
	userId: User['id'];
	remember: boolean;
	redirectTo: string;
}): Promise<Response> {
	const session = await fromRequest(request);
	session.set(USER_SESSION_KEY, userId);

	const maxAge = remember ? USER_SESSION_MAX_AGE : undefined;
	const cookieContent = await storage.commitSession(session, { maxAge });

	return redirect(safeRedirect(redirectTo), {
		headers: {
			'Set-Cookie': cookieContent,
		},
	});
}

async function logout(request: Request, redirectTo = loginHref()) {
	const session = await fromRequest(request);
	const cookieContent = await storage.destroySession(session);

	return redirect(redirectTo, {
		headers: {
			'Set-Cookie': cookieContent,
		},
	});
}

const getUserId = async (request: Request) =>
	(await fromRequest(request)).get(USER_SESSION_KEY);

async function getUser(request: Request) {
	const userId = await getUserId(request);
	return typeof userId === 'string' ? selectUserById(userId) : undefined;
}

function requireUser(
	event: FetchEvent,
	redirectTo: string = new URL(event.request.url).pathname
) {
	const user = userFromFetchEvent(event);
	if (user) return user;

	throw redirect(loginHref(redirectTo));
}

export {
	createUserSession,
	getUser,
	getUserId,
	logout,
	requireUser,
	userFromFetchEvent,
};
