import type { FetchEvent } from 'solid-start/server';

import { homeHref } from '~/route-path';
import type { User } from '~/types';

const DEFAULT_REDIRECT = homeHref;

const safeRedirect = (
	to: FormDataEntryValue | null,
	defaultRedirect = DEFAULT_REDIRECT
) =>
	!to || typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//')
		? defaultRedirect
		: to;

const userFromFetchEvent = (event: FetchEvent) =>
	'user' in event.locals && typeof event.locals.user === 'object'
		? (event.locals.user as User | undefined)
		: undefined;

export { safeRedirect, userFromFetchEvent };
