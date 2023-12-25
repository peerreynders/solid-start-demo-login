import { createEffect, Show, type Accessor } from 'solid-js';
import { Title, useSearchParams } from 'solid-start';

import { homeHref } from '~/route-path';

// --- BEGIN server side ---
import {
	createServerAction$,
	type ServerFunctionEvent,
} from 'solid-start/server';
import { FormError } from 'solid-start/data';

import { createUserSession } from '~/server/session';
import { insertUser, selectUserByEmail, verifyLogin } from '~/server/repo';

import { validateEmail } from '~/helpers';

type FieldError =
	| 'email-invalid'
	| 'email-exists'
	| 'password-missing'
	| 'password-short'
	| 'user-invalid'
	| 'kind-unknown';

function makeError(data?: {
	error: FieldError;
	fields: {
		email: string;
		password: string;
		kind: string;
	};
}) {
	let message = 'Form not submitted correctly.';
	if (!data) return new FormError(message);

	let error = data.error;
	const fieldErrors: {
		email?: string;
		password?: string;
	} = {};

	switch (error) {
		case 'email-invalid':
			message = fieldErrors.email = 'Email is invalid';
			break;

		case 'email-exists':
			message = fieldErrors.email = 'A user already exists with this email';
			break;

		case 'user-invalid':
			message = fieldErrors.email = 'Invalid email or password';
			break;

		case 'password-missing':
			message = fieldErrors.password = 'Password is required';
			break;

		case 'password-short':
			message = fieldErrors.password = 'Password is too short';
			break;

		case 'kind-unknown':
			return new Error(`Unknown kind: ${data.fields.kind}`);

		default: {
			const _exhaustiveCheck: never = error;
			error = _exhaustiveCheck;
		}
	}

	return new FormError(message, { fields: data.fields, fieldErrors });
}

function forceToString(formData: FormData, name: string) {
	const value = formData.get(name);
	return typeof value === 'string' ? value : '';
}

async function loginFn(form: FormData, event: ServerFunctionEvent) {
	const email = forceToString(form, 'email');
	const password = forceToString(form, 'password');
	const kind = forceToString(form, 'kind');

	const fields = {
		email,
		password,
		kind,
	};

	if (!validateEmail(email))
		throw makeError({ error: 'email-invalid', fields });

	if (password.length < 1)
		throw makeError({ error: 'password-missing', fields });
	if (password.length < 8) throw makeError({ error: 'password-short', fields });

	if (kind === 'signup') {
		const found = await selectUserByEmail(email);
		if (found) throw makeError({ error: 'email-exists', fields });
	} else if (kind !== 'login')
		throw makeError({ error: 'kind-unknown', fields });

	const user = await (kind === 'login'
		? verifyLogin(email, password)
		: insertUser(email, password));

	if (!user) throw makeError({ error: 'user-invalid', fields });

	const redirectTo = form.get('redirect-to');
	const remember = form.get('remember');

	return createUserSession({
		request: event.request,
		userId: user.id,
		remember: remember === 'on',
		redirectTo: typeof redirectTo === 'string' ? redirectTo : homeHref,
	});
}
// --- END server side ---

// --- BEGIN Login support ---

function makeLoginSupport() {
	const [loggingIn, login] = createServerAction$(loginFn);

	const emailError = () =>
		loggingIn.error?.fieldErrors?.email as string | undefined;
	const passwordError = () =>
		loggingIn.error?.fieldErrors?.password as string | undefined;

	const focusId = () => (passwordError() ? 'password' : 'email');

	return {
		emailError,
		focusId,
		login,
		passwordError,
	};
}

const emailHasError = (emailError: () => string | undefined) =>
	typeof emailError() !== undefined;

const emailInvalid = (emailError: () => string | undefined) =>
	emailError() ? true : undefined;

const emailErrorId = (emailError: () => string | undefined) =>
	emailError() ? 'email-error' : undefined;

const passwordHasError = (passwordError: () => string | undefined) =>
	typeof passwordError() !== undefined;

const passwordInvalid = (passwordError: () => string | undefined) =>
	passwordError() ? true : undefined;

const passwordErrorId = (passwordError: () => string | undefined) =>
	passwordError() ? 'password-error' : undefined;

const hasAutofocus = (id: string, focusId: Accessor<string>) =>
	focusId() === id;

// --- END Login support ---

export default function LoginPage() {
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams['redirect-to'] || homeHref;
	const { login, focusId, emailError, passwordError } = makeLoginSupport();

	let emailInput: HTMLInputElement | undefined;
	let passwordInput: HTMLInputElement | undefined;

	createEffect(() => {
		if (focusId() === 'password') {
			passwordInput?.focus();
		} else {
			emailInput?.focus();
		}
	});

	return (
		<div class="c-login">
			<Title>Login</Title>
			<h1 class="c-login__header">Demo Login</h1>
			<div>
				<login.Form class="c-login__form">
					<div>
						<label for="email">Email address</label>
						<input
							ref={emailInput}
							id="email"
							class="c-login__email"
							required
							autofocus={hasAutofocus('email', focusId)}
							name="email"
							type="email"
							autocomplete="email"
							aria-invalid={emailInvalid(emailError)}
							aria-errormessage={emailErrorId(emailError)}
						/>
						<Show when={emailHasError(emailError)}>
							<div id="email-error">{emailError()}</div>
						</Show>
					</div>

					<div>
						<label for="password">Password</label>
						<input
							ref={passwordInput}
							id="password"
							class="c-login__password"
							autofocus={hasAutofocus('password', focusId)}
							name="password"
							type="password"
							autocomplete="current-password"
							aria-invalid={passwordInvalid(passwordError)}
							aria-errormessage={passwordErrorId(passwordError)}
						/>
						<Show when={passwordHasError(passwordError)}>
							<div id="password-error">{passwordError()}</div>
						</Show>
					</div>
					<input type="hidden" name="redirect-to" value={redirectTo} />
					<button type="submit" name="kind" value="login">
						Log in
					</button>
					<button type="submit" name="kind" value="signup">
						Sign Up
					</button>
					<div>
						<label for="remember">
							<input
								id="remember"
								class="c-login__remember"
								name="remember"
								type="checkbox"
							/>{' '}
							Remember me
						</label>
					</div>
				</login.Form>
			</div>
		</div>
	);
}
