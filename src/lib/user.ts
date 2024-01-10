import type { Accessor } from 'solid-js';

export type User = {
	id: string;
	email: string;
};

export type MaybeUser = User | undefined;

export type UserAccessor = Accessor<MaybeUser>;

const makeUser = (id: string, email: string): User => ({ id, email });

function areSame(a: User, b: User) {
	if (a.id !== b.id) return false;
	if (a.email !== b.email) return false;
	return true;
}

export { areSame, makeUser };
