import { useSession } from '@solidjs/start/server';
import type { FetchEvent, SessionConfig } from '@solidjs/start/server';

type SessionData = {
	userId?: string | undefined;
};
type Awaited<T> = T extends PromiseLike<infer U> ? U : T;
type SessionManager = Awaited<ReturnType<typeof useSession<SessionData>>>;

const config: SessionConfig = (() => { 
	if(typeof process.env.SESSION_SECRET === 'string' && process.env.SESSION_SECRET.length > 32)
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

function addUser(data: SessionData) {
	data.userId = 'AC3wvetqX45fYsIxxxCEl';
	return data;
}

//const getSession = (event: FetchEvent) =>
//	useSession<SessionData>(event, config);

async function getSession(event: FetchEvent) {
	const session = await useSession<SessionData>(event, config);

	if (typeof session.data.userId !== 'string') {
		await session.update(addUser);
	}

	return session;
}

export {
	getSession,
}
