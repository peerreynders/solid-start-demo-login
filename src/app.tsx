// @refresh reload
import { MetaProvider, Title } from '@solidjs/meta';
import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start';
import { Suspense } from 'solid-js';
import { UserProvider } from './components/user-context';

// i.e. leave it to the bundler
// to inline CSS or in a split bundle
import './styles.css';

export default function App() {
	return (
		<Router
			root={(props) => (
				<MetaProvider>
					<Title>SolidStart - Demo login</Title>
					{/* Put head tags <Base />, <Link />, <Meta />, <Style>, <Title> here */}
					<UserProvider>
						<Suspense>{props.children}</Suspense>
					</UserProvider>
				</MetaProvider>
			)}
		>
			<FileRoutes />
		</Router>
	);
}
