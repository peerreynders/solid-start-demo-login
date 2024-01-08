import { Observable } from 'rxjs';

import type { Observer } from 'rxjs';
import type { FromUserStore, HashUser, SeedContent, UserInfo } from './types';

const content: SeedContent = [
	['johnsmith@outlook.com', 'J0hn5M1th'],
	['kody@gmail.com', 'twixrox'],
];

const byAscIndex = <T extends { i: number }>(a: T, b: T) => a.i - b.i;

function appendStore(store: FromUserStore, info: UserInfo) {
	const { email, hash, id } = info;
	store.users.push({ email, id });
	store.authns.push({ hash, id });
	return store;
}

function makeFromSeed(hashUser: HashUser) {
	const fromSeed = new Observable((observer: Observer<FromUserStore>) => {
		let lastError: Error | undefined;
		let subscribed = true;

		const error = <T extends Error>(err: T) => {
			if (!subscribed || lastError) return;

			lastError = err;
			// ERROR
			observer.error(lastError);
		};

		const entries: UserInfo[] = [];
		const next = (email: string, hash: string, id: string, i: number) => {
			if (!subscribed || lastError || entries.length >= content.length) return;

			entries.push({ email, hash, id, i });
			if (entries.length < content.length) return;

			// Entries complete finish processing
			// NEXT/COMPLETE: Entries complete finish processing
			observer.next(
				entries.sort(byAscIndex).reduce<FromUserStore>(appendStore, {
					kind: 'user-store',
					users: [],
					authns: [],
				})
			);
			observer.complete();
		};

		for (let i = 0; i < content.length && subscribed; i += 1) {
			const [email, password] = content[i];
			hashUser(email, password, i, next, error);
		}

		return () => void (subscribed = false);
	});

	return fromSeed;
}

export { makeFromSeed };
