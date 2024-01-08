import { action, cache } from '@solidjs/router';
import { logout as logoutFn, userFromSession } from './server';

const getUser = cache(userFromSession, 'user');
const logout = action(logoutFn, 'logout');

export { getUser, logout };
