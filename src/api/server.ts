'use server';
import { getRequestEvent } from 'solid-js/web';
import { redirect } from '@solidjs/router';

import { homeHref } from '../route-path'; 
import { validateEmail } from '../helpers';
import { clearSession, renewSession } from '../server/session';
import { userFromFetchEvent } from '../server/helpers';
import { insertUser, selectUserByEmail, verifyLogin } from '../server/repo';

async function logoutFn() {
	const event = getRequestEvent();
	if (!event) throw Error('Unable to access logout request');

	const { user: _user, ...rest } = event.locals;
	event.locals = rest;
	await clearSession(event);

	throw redirect('/login');
}

type SignInErrorKind =
	| 'email-invalid'
	| 'email-exists'
	| 'password-missing'
	| 'password-short'
	| 'user-invalid'
	| 'kind-unknown';

type SignInFieldErrors = {
	email?: string,
	password?: string,
};

class SignInError extends Error {
	errors: SignInFieldErrors;

  constructor(
    message: string,
    errors: SignInFieldErrors,
  ) {
    super(message);
		this.errors = errors;
  }
}

function makeSignInError(
	errorKind: SignInErrorKind,
	signInKind: string
){
	let message = 'Form not submitted correctly.';
	const errors: SignInFieldErrors = Object.create(null);

	switch (errorKind) {
		case 'email-invalid':
			message = errors.email = 'Email is invalid';
			break;

		case 'email-exists':
			message = errors.email = 'A user already exists with this email';
			break;

		case 'user-invalid':
			message = errors.email = 'Invalid email or password';
			break;

		case 'password-missing':
			message = errors.password = 'Password is required';
			break;

		case 'password-short':
			message = errors.password = 'Password is too short';
			break;

		case 'kind-unknown':
			message = `Unknown kind: ${signInKind}`;
			break;

		default: {
			const _exhaustiveCheck: never = errorKind;
			return _exhaustiveCheck;
		}
	}

	return new SignInError(message, errors);
}

function forceToString(formData: FormData, name: string) {
	const value = formData.get(name);
	return typeof value === 'string' ? value : '';
}

async function signInFn(form: FormData){
	const email = forceToString(form, 'email');
	const password = forceToString(form, 'password');
	const kind = forceToString(form, 'kind');

	if (!validateEmail(email))
		return makeSignInError('email-invalid', kind);	

	if (password.length < 1) return makeSignInError('password-missing', kind);
	if (password.length < 8) return makeSignInError('password-short', kind);

	if (kind === 'signup') {
		const found = await selectUserByEmail(email);
		if (found) return makeSignInError('email-exists', kind);
	} else if (kind !== 'login')
		return makeSignInError('kind-unknown', kind);

	const user = await (kind === 'login'
		? verifyLogin(email, password)
		: insertUser(email, password));

	if (!user) return makeSignInError('user-invalid', kind);

	const event = getRequestEvent();
	// Note: Server Side Error
	if (!event) throw new Error('Unable to access request');

	const redirectValue = form.get('redirect-to');
	const redirectTo = typeof redirectValue === 'string' ? redirectValue : homeHref;
	const remember = form.get('remember') === 'on';

	await renewSession(event, user, remember);
	throw redirect(redirectTo);
}

async function userFromSession() {
	const event = getRequestEvent();
	if (!event) return undefined;
	if ('user' in event.locals) return event.locals.user;

	return userFromFetchEvent(event);
}

export { logoutFn, signInFn, userFromSession };