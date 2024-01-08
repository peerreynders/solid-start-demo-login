// file: src/server/types.ts
export type { User } from '../types';
import type { User } from '../types';

export type HashedCallback = (
	email: string,
	hash: string,
	id: string,
	i: number
) => void;

export type HashUser = (
	email: string,
	password: string,
	i: number,
	cb: HashedCallback,
	error: (error: Error) => void
) => void;

export type Authn = {
	hash: string;
	id: string;
};

export type SeedContent = [
	email: string,
	password: string,
	//‡ todos: [title: string, completed: boolean, createdAt: string][]
][];

export type UserInfo = { i: number; email: string; hash: string; id: string };

export type FromUserStore = {
	kind: 'user-store';
	users: User[];
	authns: Authn[];
};

type RequestLocal = {
	user?: User | undefined;
};

declare module 'solid-js/web' {
	interface RequestEvent {
		locals: RequestLocal;
	}
}
