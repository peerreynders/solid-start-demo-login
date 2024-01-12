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

export { makeUser, equivalent };
