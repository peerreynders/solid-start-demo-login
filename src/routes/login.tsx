// file: src/routes/index.tsx
import { createEffect, Show } from 'solid-js';
import { isServer } from 'solid-js/web';
import { Title } from '@solidjs/meta';
import { useSubmission, type RouteSectionProps } from '@solidjs/router';
import { signIn } from '../api';
import { homeHref } from '../route-path';

const emailHasError = (emailError: () => string | undefined) =>
	typeof emailError() !== 'undefined';

const emailInvalid = (emailError: () => string | undefined) =>
	emailError() ? true : undefined;

const emailErrorId = (emailError: () => string | undefined) =>
	emailError() ? 'email-error' : undefined;

const passwordHasError = (passwordError: () => string | undefined) =>
	typeof passwordError() !== 'undefined';

const passwordInvalid = (passwordError: () => string | undefined) =>
	passwordError() ? true : undefined;

const passwordErrorId = (passwordError: () => string | undefined) =>
	passwordError() ? 'password-error' : undefined;

function autofocusAt(focusId: () => string, id: string) {
	if (isServer) {
		return focusId() === id ? true : undefined;
	}

	return undefined;
}

const redirectTo = (props: RouteSectionProps) =>
	props.location.query['redirect-to'] || homeHref;

export default function Login(props: RouteSectionProps) {
	const signingIn = useSubmission(signIn);
	const emailError = () =>
		signingIn.result?.errors?.email as string | undefined;
	const passwordError = () =>
		signingIn.result?.errors?.password as string | undefined;
	const focusId = () => (passwordError() ? 'password' : 'email');

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
				<form action={signIn} method="post" class="c-login__form">
					<div>
						<label for="email">Email address</label>
						<input
							ref={emailInput}
							id="email"
							class="c-login__email"
							required
							autofocus={autofocusAt(focusId, 'email')}
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
							autofocus={autofocusAt(focusId, 'password')}
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
					<input type="hidden" name="redirect-to" value={redirectTo(props)} />
					<button type="submit" name="kind" value="login">
						Log In
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
				</form>
			</div>
		</div>
	);
}
