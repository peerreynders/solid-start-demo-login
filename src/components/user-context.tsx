import {
	createContext,
	createResource,
	useContext,
	type ParentProps,
	type Resource,
} from 'solid-js';
import { isServer } from 'solid-js/web';
import { useServerContext } from 'solid-start';
import server$, { type ServerFunctionEvent } from 'solid-start/server';

import { userFromFetchEvent } from '~/server/helpers';
import type { User } from '~/types';

// --- START server side ---

function userFromSession(this: ServerFunctionEvent) {
	return userFromFetchEvent(this);
}

// --- END server side ---

const clientSideSessionUser = server$(userFromSession);

const userEquals = (prev: User, next: User) =>
	prev.id === next.id && prev.email === next.email;

const userChanged = (prev: User | undefined, next: User | undefined) => {
	const noPrev = typeof prev === 'undefined';
	const noNext = typeof next === 'undefined';

	// Logical XOR - only one is undefined
	if (noPrev ? !noNext : noNext) return true;

	// Both undefined or User
	return noPrev ? false : !userEquals(prev, next as User);
};

function makeSessionUser(isRouting: () => boolean) {
	let routing = false;
	let toggle = 0;

	const refreshUser = () => {
		const last = routing;
		routing = isRouting();
		if (last || !routing) return toggle;

		// isRouting: false ➔  true transition
		// Toggle source signal to trigger user fetch
		toggle = 1 - toggle;
		return toggle;
	};

	const fetchUser = async (
		_toggle: number,
		{ value }: { value: User | undefined; refetching: boolean | unknown }
	) => {
		const next = await (isServer
			? userFromFetchEvent(useServerContext())
			: clientSideSessionUser());

		// Maintain referential stability if
		// contents doesn't change
		return userChanged(value, next) ? next : value;
	};

	const [userResource] = createResource<User | undefined, number>(
		refreshUser,
		fetchUser
	);

	return userResource;
}

const UserContext = createContext<Resource<User | undefined> | undefined>();

export type Props = ParentProps & {
	isRouting: () => boolean;
};

function UserProvider(props: Props) {
	return (
		<UserContext.Provider value={makeSessionUser(props.isRouting)}>
			{props.children}
		</UserContext.Provider>
	);
}

const useUser = () => useContext(UserContext);

export { UserProvider, useUser };
