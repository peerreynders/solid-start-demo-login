// @refresh reload
import { UserProvider, useUser } from './components/user-context';
import './app.css';

import type { Resource } from 'solid-js';
import type { User } from './types';

export default function App() {
  return (
		<UserProvider>
			<Index />
		</UserProvider>
  );
}

const userEmail = (user: Resource<User | undefined> | undefined) =>
	user?.()?.email ?? '';

function selectName(email: string) {
	const indexEnd = email.indexOf('@');
	return indexEnd > 0
		? email.slice(0, indexEnd)
		: indexEnd < 0 && email.length > 0
		? email
		: 'world';
}

function Index() {
	const user = useUser();

	return (
		<main>
			<h1>Hello {selectName(userEmail(user))}!</h1>
			<footer class="c-info">
				<p class="c-info__line">
					Visit{' '}
					<a href="https://start.solidjs.com" target="_blank">
						start.solidjs.com
					</a>{' '}
					to learn how to build SolidStart apps.
				</p>
				<div>
				</div>
			</footer>
		</main>	
	);
}
