import {
	createContext,
	createResource,
	useContext,
	type ParentProps,
	type Resource,
} from 'solid-js';

import { getRequestEvent } from 'solid-js/web';

import { userFromFetchEvent } from '../server/helpers';

import type { User } from '../types';

function userFromSession() {
	"use server";
	return userFromFetchEvent(getRequestEvent());
}

function makeSessionUser() {
	const [userResource] = createResource<User | undefined>(userFromSession);

	return userResource;
}

const UserContext = createContext<Resource<User | undefined> | undefined>();

type Props = ParentProps;

function UserProvider(props: Props) {
	return (
		<UserContext.Provider value={makeSessionUser()}>
			{props.children}
		</UserContext.Provider>
	);
}

const useUser = () => useContext(UserContext);

export { UserProvider, useUser };
