// file: src/api/index.ts
import { action, cache } from '@solidjs/router';
import { getUserSync, signInFn, signOutFn } from './server';

import type { MaybeUser } from '../lib/user';

const getUser = cache<() => Promise<MaybeUser>, Promise<MaybeUser>>(
	async () => {
		'use server';
		return getUserSync();
	},
	'user'
);

const signOut = action(signOutFn, 'sign-out');
const signIn = action(signInFn, 'sign-in');

// functions allowed while unauthenticated
// `$$function0` originates from `vinxi-directives/plugins/wrap-exports.js`: presumably `getUser`
const allowedFnName = ['$$function0', 'signInFn', 'signOutFn'];
const isAllowedFnName = (fnName: string) => allowedFnName.includes(fnName);

export { isAllowedFnName, getUser, signIn, signOut };
