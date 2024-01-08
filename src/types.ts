import type { Accessor } from 'solid-js';

export type User = {
	id: string;
	email: string;
};

export type MaybeUser = User | undefined;

export type UserAccessor = Accessor<MaybeUser>;
