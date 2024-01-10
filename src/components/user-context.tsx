import { createContext, createMemo, useContext } from 'solid-js';
import { areSame, makeUser } from '../lib/user';

import type { ParentProps } from 'solid-js';
import type { MaybeUser, UserAccessor } from '../lib/user';

function forwardUser(accessor: UserAccessor) {
	const user = createMemo<MaybeUser>((currentUser) => {
		const nextUser = accessor();
		if (nextUser === undefined) return undefined;

		if (currentUser === undefined || !areSame(currentUser, nextUser))
			return makeUser(nextUser.id, nextUser.email);

		// maintain referential stability as user hasn't changed
		return currentUser;
	}, undefined);

	return user;
}

const UserContext = createContext<UserAccessor | undefined>();

type Props = { accessor: UserAccessor } & ParentProps;

function UserProvider(props: Props) {
	return (
		<UserContext.Provider value={forwardUser(props.accessor)}>
			{props.children}
		</UserContext.Provider>
	);
}

const useUser = () => useContext(UserContext);

export { UserProvider, useUser };
