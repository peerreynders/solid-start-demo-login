import { action, cache } from '@solidjs/router';
import { logoutFn, signInFn, userFromSession } from './server';

export type { SignInSubmission } from './server'

const getUser = cache(userFromSession, 'user');
const logout = action(logoutFn, 'logout');
const signIn = action(signInFn, 'signin');

export { getUser, logout, signIn };
