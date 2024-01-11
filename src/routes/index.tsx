// file: src/routes/index.tsx
import { signOut } from '../api';
import { useUser } from '../components/user-context';

import type { Accessor } from 'solid-js';
import type { MaybeUser } from '../types';

const userEmail = (user: Accessor<MaybeUser>) => user()?.email ?? '';

function selectName(email: string) {
	const indexEnd = email.indexOf('@');
	return indexEnd > 0
		? email.slice(0, indexEnd)
		: indexEnd < 0 && email.length > 0
			? email
			: 'world';
}

export default function Home() {
	const user = useUser();

	return (
		<main>
			<h1>Hello {selectName(userEmail(user))}!</h1>
			<footer class="c-info">
				<p class="c-info-learn">
					Visit{' '}
					<a href="https://start.solidjs.com" target="_blank">
						start.solidjs.com
					</a>{' '}
					to learn how to build SolidStart apps.
				</p>
				<div>
					<form method="post" action={signOut} class="c-info__logout">
						<button
							name="logout"
							type="submit"
							class="c-info__pointer u-flat-button"
						>
							Logout
						</button>
					</form>
				</div>
			</footer>
		</main>
	);
}
