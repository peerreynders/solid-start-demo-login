import {
	createContext,
	//	createResource,
	useContext,
	type ParentProps,
	//	type Resource,
} from 'solid-js';

import { createAsync } from '@solidjs/router';

import { userFromSession as getUser } from '../api/server';

import type { MaybeUser, UserAccessor } from '../types';

function makeSessionUser() {
	const user = createAsync<MaybeUser>(getUser);

	return user;
}

const UserContext = createContext<UserAccessor | undefined>();

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
