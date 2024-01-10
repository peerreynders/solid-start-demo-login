// @refresh reload
import { Suspense } from 'solid-js';
import { createAsync, Router } from '@solidjs/router';
import { MetaProvider, Title } from '@solidjs/meta';
import { FileRoutes } from '@solidjs/start';

import { getUser } from '~/api';
import { UserProvider } from './components/user-context';

// i.e. leave it to the bundler
// to inline CSS or in a split bundle
import './styles.css';

import type { ParentProps } from 'solid-js';
import type { RouteDefinition } from '@solidjs/router';

export const route = {
	load: () => getUser(),
} satisfies RouteDefinition;

function Root(props: ParentProps) {
	const user = createAsync(getUser, { deferStream: true });
	return (
		<MetaProvider>
			<Title>SolidStart - Demo login</Title>
			{/* Put head tags <Base />, <Link />, <Meta />, <Style>, <Title> here */}
			<UserProvider accessor={user}>
				<Suspense>{props.children}</Suspense>
			</UserProvider>
		</MetaProvider>
	);
}

export default function App() {
	return (
		<Router root={Root}>
			<FileRoutes />
		</Router>
	);
}
