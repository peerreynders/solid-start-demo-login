import { createContext, createMemo, useContext } from 'solid-js';
import { conditionUser } from '../lib/user';

import { isServer } from 'solid-js/web';
import { userFromSession } from '../server/user-from';

import type { Accessor, ParentProps } from 'solid-js';
import type { MaybeUser } from '../lib/user';

const forwardUser = (source: Accessor<MaybeUser>) =>
	createMemo<MaybeUser>((current: MaybeUser) => {
		if (isServer) return userFromSession();

		return conditionUser(current, source());
	}, undefined);

const UserContext = createContext<Accessor<MaybeUser>>();

type Props = { user: Accessor<MaybeUser> } & ParentProps;

function UserProvider(props: Props) {
	return (
		<UserContext.Provider value={forwardUser(props.user)}>
			{props.children}
		</UserContext.Provider>
	);
}

const useUser = () => {
	const value = useContext(UserContext);
	if (!value) throw new Error('Uninitialized UserContext');
	return value;
};

export { UserProvider, useUser };
