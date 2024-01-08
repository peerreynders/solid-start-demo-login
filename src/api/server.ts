'use server';
import { redirect } from '@solidjs/router';
import { getRequestEvent } from 'solid-js/web';

import { clearSession } from '../server/session';
import { userFromFetchEvent } from '../server/helpers';

async function logout() {
	const event = getRequestEvent();
	if (!event) throw Error('Unable to access logout request');

	const { user: _user, ...rest } = event.locals;
	event.locals = rest;
	await clearSession(event);

	throw redirect('/login');
}

async function userFromSession() {
	const event = getRequestEvent();
	if (!event) return undefined;
	if ('user' in event.locals) return event.locals.user;

	return userFromFetchEvent(event);
}

export { logout, userFromSession };
