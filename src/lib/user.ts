// file src/lib/user.ts
export type User = {
	id: string;
	email: string;
};

export type MaybeUser = User | undefined;

const makeUser = (id: string, email: string): User => ({ id, email });

function equivalent(a: User, b: User) {
	if (a.id !== b.id) return false;
	if (a.email !== b.email) return false;
	return true;
}

// Condition the value for a cleaner signal :)
// (whose value maintains referential stability when appropriate)
function conditionUser(current: MaybeUser, next: MaybeUser) {
	if (next === undefined) return undefined;

	if (current === undefined || !equivalent(current, next))
		return makeUser(next.id, next.email);

	// maintain referential stability as user hasn't changed
	return current;
}

export { conditionUser };
