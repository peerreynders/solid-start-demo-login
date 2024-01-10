import {
	clearSession as clear,
	deleteCookie,
	getCookie,
	unsealSession,
	updateSession,
} from 'h3';
import type { H3Event, Session } from 'h3';
// import { getSession, updateSession } from '@solidjs/start/server';
//import { updateSession } from '@solidjs/start/server';

import type { RequestEvent } from 'solid-js/web';
import type { SessionConfig } from '@solidjs/start/server';
import type { User } from '../types';

export type SessionRecord = {
	userId?: string | undefined;
	remember?: true | undefined;
};

const USER_SESSION_NAME = '__session';
const USER_SESSION_KEY = 'userId';
const USER_SESSION_REMEMBER = 'remember';
const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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
		maxAge: 86400, // 24h
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

//const getSession = (event: FetchEvent) =>
//	useSession<SessionData>(event, config);

// TODO: replace
// https://github.com/solidjs/solid-start/issues/1192
// https://github.com/unjs/h3/blob/ae91fc8658315dca75da22b665eda4175eef7ea8/src/utils/session.ts#L67
type SessionDataT = Record<string, unknown>;
const DEFAULT_NAME = 'h3';
async function getSession<T extends SessionDataT = SessionDataT>(
	event: H3Event,
	config: SessionConfig
): Promise<Session<T>> {
	const sessionName = config.name || DEFAULT_NAME;
	const sessions = event.context.sessions
		? event.context.sessions
		: Object.create(null);
	if (event.context.sessions) {
		if (sessions[sessionName]) return sessions[sessionName] as Session<T>;
	} else {
		event.context.sessions = sessions;
	}

	const session = {
		id: '',
		createdAt: 0,
		data: Object.create(null),
	};
	sessions[sessionName] = session;

	const sealedSession = getCookie(event, sessionName);
	if (sealedSession) {
		// Unseal session data from cookie
		const unsealed = await unsealSession(event, config, sealedSession).catch(
			() => {}
		);
		Object.assign(session, unsealed);
	}

	if (!session.id) {
		session.id = crypto.randomUUID();
		session.createdAt = Date.now();
		await updateSession(event, config);
	}

	return session;
}

async function sessionFromEvent(event: RequestEvent) {
	const session = await getSession<SessionRecord>(event, config);
	return session;
}

const makeSessionUpdate =
	(userId: string, remember: true | undefined) => (record: SessionRecord) => {
		const { userId: _userId, remember: _remember, ...rest } = record;
		const nextRecord: SessionRecord = remember
			? { userId, remember: true, ...rest }
			: { userId, ...rest };
		return nextRecord;
	};

async function renewSession(
	event: RequestEvent,
	user: User,
	maybeRemember?: boolean | undefined
) {
	let sessionConfig = selectConfig(maybeRemember);
	const session = await getSession<SessionRecord>(event, sessionConfig);
	const remember =
		typeof maybeRemember === 'undefined'
			? session.data[USER_SESSION_REMEMBER]
			: maybeRemember || undefined;
	sessionConfig = selectConfig(remember);

	event.locals.user = user;

	await updateSession(
		event,
		sessionConfig,
		makeSessionUpdate(user.id, remember)
	);
}

function clearSession(event: RequestEvent) {
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
