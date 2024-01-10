import { getRequestEvent } from 'solid-js/web';
import { action, cache } from '@solidjs/router';
import { logoutFn, signInFn } from './server';
import { userFromRequestEvent } from '../server/helpers';

import type { MaybeUser } from '../types';

async function userFromSession() {
	'use server';
	const event = getRequestEvent();
	if (!event) return undefined;
	return userFromRequestEvent(event);
}

const getUser = cache<() => Promise<MaybeUser>, Promise<MaybeUser>>(
	userFromSession,
	'user'
);
const logout = action(logoutFn, 'logout');
const signIn = action(signInFn, 'signin');

export { getUser, logout, signIn };
