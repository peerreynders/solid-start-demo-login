import {
	createHandler,
	renderAsync,
	StartServer,
	type MiddlewareInput,
	type MiddlewareFn,
} from 'solid-start/entry-server';
import { redirect } from 'solid-start/server';
import { getUser, logout } from './server/session';
import { homeHref, loginHref, logoutHref } from './route-path';

// --- BEGIN dev dependency
import { start as startRepo } from '~/server/repo';

startRepo();
// --- END dev dependency

const protectedPaths = new Set([homeHref]);

function userMiddleware({ forward }: MiddlewareInput): MiddlewareFn {
	return async (event) => {
		const loginRoute = loginHref();
		const route = new URL(event.request.url).pathname;
		if (route === logoutHref) return logout(event.request, loginRoute);

		// Attach user to FetchEvent if available
		const user = await getUser(event.request);

		if (!user && protectedPaths.has(route)) return redirect(loginHref(route));

		event.locals['user'] = user;

		return forward(event);
	};
}

export default createHandler(
	userMiddleware,
	renderAsync((event) => <StartServer event={event} />)
);
