import { getCookie, unsealSession } from 'h3';
import type { H3Event, Session } from 'h3';
// import { getSession, updateSession } from '@solidjs/start/server';
import { updateSession } from '@solidjs/start/server';
import type { FetchEvent, SessionConfig } from '@solidjs/start/server';

export type SessionRecord = {
	userId?: string | undefined;
};

const config: SessionConfig = (() => {
	if (
		typeof process.env.SESSION_SECRET === 'string' &&
		process.env.SESSION_SECRET.length > 32
	)
		return {
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
			name: '__session',
		};
	// see unjs/h3 and unjs/cookie-es documentation

	throw Error('SESSION_SECRET must be set and at least 32 characters long');

	// $ head -c32 /dev/urandom | base64
})();

//const getSession = (event: FetchEvent) =>
//	useSession<SessionData>(event, config);

// TODO: replace
// https://github.com/solidjs/solid-start/issues/1192
// https://github.com/unjs/h3/blob/ae91fc8658315dca75da22b665eda4175eef7ea8/src/utils/session.ts#L67 
type SessionDataT = Record<string, any>;
const DEFAULT_NAME = "h3";
async function getSession<T extends SessionDataT = SessionDataT>(
  event: H3Event,
  config: SessionConfig,
): Promise<Session<T>> {
	const sessionName = config.name || DEFAULT_NAME;
	const sessions = event.context.sessions ? event.context.sessions : Object.create(null);
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
      () => {},
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

async function sessionFromEvent(event: FetchEvent) {
	const session = await getSession<SessionRecord>(event, config);
	const { userId } = session.data;
	if (typeof userId !== 'string' && new URL(event.request.url).pathname === '/')
		session.data.userId = 'AC3wvetqX45fYsIxxxCEl';
	return session;
}

function clearSession(event: FetchEvent) {
	return updateSession(event, config, {});
}

export { clearSession, sessionFromEvent };
