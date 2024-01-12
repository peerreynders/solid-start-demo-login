// file: src/components/user-context.tsx
import { createContext, createMemo, useContext } from 'solid-js';
import { makeUser, equivalent } from '../lib/user';

import { isServer } from 'solid-js/web';
import { userFromSession } from '../server/user-from';

import type { Accessor, ParentProps } from 'solid-js';
import type { MaybeUser } from '../lib/user';

const forwardUser = (source: Accessor<MaybeUser>) =>
	createMemo<MaybeUser>((current) => {
		if (isServer) return userFromSession();

		const next = source();
		return !next
			? undefined
			: current && equivalent(current, next)
				? current
				: makeUser(next.id, next.email);
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
