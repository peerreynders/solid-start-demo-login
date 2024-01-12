// file: src/server/session.ts
import {
	clearSession as clear,
	deleteCookie,
	getSession,
	updateSession,
} from '@solidjs/start/server';

import type { RequestEvent } from 'solid-js/web';
import type { Session, SessionConfig } from '@solidjs/start/server';
import type { User } from '../lib/user';

export type SessionRecord = {
	userId?: string | undefined;
};

const USER_SESSION_NAME = '__session';
const USER_SESSION_KEY = 'userId';
const USER_SESSION_MAX_AGE = 604800; // 7 days

const [config, configRemember]: [SessionConfig, SessionConfig] = (() => {
	if (
		typeof process.env.SESSION_SECRET !== 'string' ||
		process.env.SESSION_SECRET.length < 32
	)
		throw Error('SESSION_SECRET must be set and at least 32 characters long');

	// $ head -c32 /dev/urandom | base64

	const config: SessionConfig = {
		cookie: {
			// domain?: string | undefined
			// encode?: (value: string) => string
			// expires?: Date | undefined
			httpOnly: true,
			// maxAge?: number | undefined
			path: '/',
			// priority?: "low" | "medium" | "high" | undefined
			sameSite: 'lax',
			secure: true,
		},
		password: process.env.SESSION_SECRET,
		// maxAge?: number | undefined used to set `expires` on cookie
		name: USER_SESSION_NAME,
	};
	// see unjs/h3 and unjs/cookie-es documentation

	return [
		config,
		{ ...config, cookie: { ...config.cookie, maxAge: USER_SESSION_MAX_AGE } },
	];
})();

const selectConfig = (remember: boolean | undefined) =>
	remember === true ? configRemember : config;

async function sessionFromEvent(event: RequestEvent) {
	const session = await getSession<SessionRecord>(event, config);
	return session;
}

async function renewSession(
	event: RequestEvent,
	user: User,
	maybeRemember?: boolean | undefined
) {
	event.locals.user = user;

	const userId = user.id;
	const sessionConfig = selectConfig(maybeRemember);
	await updateSession(event, sessionConfig, (_record) => ({ userId }));
}

function clearSession(event: RequestEvent) {
	// h3 `clearSession` only clears the cookie
	// data but doesn't remove the cookie itself
	return clear(event, config).then(() =>
		deleteCookie(event, USER_SESSION_NAME)
	);
}

const sessionUserId = (session: Session<SessionRecord>) =>
	session.data[USER_SESSION_KEY];

export {
	USER_SESSION_NAME,
	clearSession,
	renewSession,
	sessionFromEvent,
	sessionUserId,
};
