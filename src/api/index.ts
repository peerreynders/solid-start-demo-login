// file: src/api/intext.ts
import { action, cache } from '@solidjs/router';
import { signInFn, signOutFn } from './server';
import { userFromSession } from '../server/helpers';

import type { MaybeUser } from '../types';

const getUser = cache<() => Promise<MaybeUser>, Promise<MaybeUser>>(
	async () => {
		'use server';
		return userFromSession();
	},
	'user'
);
const signOut = action(signOutFn, 'sign-out');
const signIn = action(signInFn, 'sign-in');

export { getUser, signIn, signOut };
