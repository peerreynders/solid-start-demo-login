// file: src/server/repo.ts
import { createStorage } from 'unstorage';
import fsLiteDriver from 'unstorage/drivers/fs-lite';
import { map, Observable, rx, type Observer, type Subscription } from 'rxjs';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { makeFromSeed } from './seed';

import type { User } from '../lib/user';
import type { Authn, FromUserStore, HashedCallback } from './types';

function hashUser(
	email: string,
	password: string,
	i: number,
	cb: HashedCallback,
	error: (err: Error) => void
) {
	bcrypt.genSalt(10, (err, salt) => {
		if (!err) {
			bcrypt.hash(password, salt, (err, hash) => {
				if (!err) {
					const id = nanoid();
					cb(email, hash, id, i);
					return;
				}

				error(err);
			});
			return;
		}

		error(err);
	});
}

const storage = createStorage({
	driver: fsLiteDriver({
		base: '.data',
	}),
});

type MaybeUserStore = [
	kind: 'user-store',
	users: User[] | null,
	authns: Authn[] | null,
];

type MaybeUsers = [kind: 'users', users: User[] | null];

type FromUsers = {
	kind: 'users';
	users: User[];
};

function saveToUserStore(forUserStore: Observable<FromUserStore>) {
	const afterSave = new Observable((observer: Observer<FromUserStore>) => {
		forUserStore.subscribe((store: FromUserStore) => {
			// Save users, authns lists to file
			rx(
				Promise.all([
					storage.setItem<User[]>('users', store.users),
					storage.setItem<Authn[]>('authns', store.authns),
				]),
				map((_v) => store)
			).subscribe(observer);
		});
	});
	return afterSave;
}

function toUserStore(fromStorage: Observable<MaybeUserStore>) {
	const fromUserStore = new Observable((observer: Observer<FromUserStore>) => {
		let initializationSubscription: Subscription | undefined;
		let storageSubscription: Subscription | undefined = fromStorage.subscribe(
			(maybe: MaybeUserStore) => {
				storageSubscription = undefined;

				const [, users, authns] = maybe;
				if (Array.isArray(users)) {
					if (Array.isArray(authns)) {
						observer.next({ kind: 'user-store', users, authns });
						observer.complete();
						return;
					}

					observer.error(new Error('Missing authns store'));
					return;
				}

				// both null
				initializationSubscription = rx(
					makeFromSeed(hashUser),
					saveToUserStore
				).subscribe({
					next: (value) => observer.next(value),
					complete: () => observer.complete(),
					error: (err) => observer.error(err),
				});
			}
		);

		return () => {
			if (storageSubscription) storageSubscription.unsubscribe();
			if (initializationSubscription) initializationSubscription.unsubscribe();
		};
	});

	return fromUserStore;
}

function toUsers(fromStorage: Observable<MaybeUsers>) {
	const fromUsers = new Observable((observer: Observer<FromUsers>) => {
		let initializationSubscription: Subscription | undefined;
		let storageSubscription: Subscription | undefined = fromStorage.subscribe(
			(maybe: MaybeUsers) => {
				storageSubscription = undefined;

				const [, users] = maybe;
				if (Array.isArray(users)) {
					observer.next({ kind: 'users', users });
					observer.complete();

					return;
				}

				initializationSubscription = rx(
					makeFromSeed(hashUser),
					saveToUserStore,
					map(({ users }) => ({ kind: 'users', users }) as const)
				).subscribe({
					next: (value) => observer.next(value),
					complete: () => observer.complete(),
					error: (err) => observer.error(err),
				});
			}
		);

		return () => {
			if (storageSubscription) storageSubscription.unsubscribe();
			if (initializationSubscription) initializationSubscription.unsubscribe();
		};
	});

	return fromUsers;
}

type AppendNewUser = {
	users: User[];
	authns: Authn[];
	email: string;
	password: string;
};

function appendNewUser(fromInsertUser: Observable<AppendNewUser>) {
	const fromUser = new Observable((observer: Observer<User>) => {
		let subscription: Subscription | undefined = fromInsertUser.subscribe(
			({ email, password, users, authns }: AppendNewUser) => {
				hashUser(
					email,
					password,
					0,
					(email, hash, id, _i) => {
						const user: User = { email, id };
						users.push(user);
						authns.push({ id, hash });
						const store: FromUserStore = { kind: 'user-store', users, authns };

						// Save updated lists to files
						// then pass on new user
						rx(
							new Observable((observer: Observer<FromUserStore>) => {
								observer.next(store);
								observer.complete();
							}),
							saveToUserStore,
							map((_v) => user)
						).subscribe(observer);
					},
					observer.error
				);
			}
		);

		return () => {
			if (subscription) subscription.unsubscribe();
			subscription = undefined;
		};
	});
	return fromUser;
}

const findUserByEmail = (users: User[], email: User['email']) =>
	users.findIndex((user) => user.email === email);

function selectAuthnByEmailFn(store: FromUserStore, email: string) {
	const userIndex = findUserByEmail(store.users, email);
	if (userIndex < 0) return;
	const id = store.users[userIndex].id;
	const authnIndex = store.authns.findIndex((authn) => authn.id === id);
	return authnIndex > -1
		? ([userIndex, authnIndex] as [number, number])
		: undefined;
}

type VerifyLoginTask = {
	kind: 0;
	email: User['email'];
	password: string;
	resolve: (user: User | undefined) => void;
	reject: (error: Error) => void;
};

function runVerifyLogin(task: VerifyLoginTask, done: () => void) {
	const error = (err: Error) => {
		task.reject(err);
		done();
	};
	const failed = () => {
		task.resolve(undefined);
		done();
	};
	const authenticated = (user: User) => {
		task.resolve(user);
		done();
	};

	const userStoreObserver = {
		error,
		next: (store: FromUserStore) => {
			const result = selectAuthnByEmailFn(store, task.email);
			if (!result) {
				failed();
				return;
			}

			const [userIndex, authnIndex] = result;
			bcrypt.compare(
				task.password,
				store.authns[authnIndex].hash,
				(err, matched) => {
					if (err) {
						// Something went wrong
						error(err);
						return;
					}

					if (matched) {
						// Password matched
						authenticated(store.users[userIndex]);
						return;
					}

					// Password didn't match
					failed();
				}
			);
		},
	};

	rx(
		Promise.all([
			'user-store',
			storage.getItem<User[]>('users'),
			storage.getItem<Authn[]>('authns'),
		] as const),
		toUserStore
	).subscribe(userStoreObserver);
}

function runUserByPredicate(
	resolve: (user: User | undefined) => void,
	reject: (err: Error) => void,
	predicate: (user: User) => boolean,
	done: () => void
) {
	const usersObserver = {
		error: (err: Error) => {
			reject(err);
			done();
		},
		next: (store: FromUsers) => {
			const index = store.users.findIndex(predicate);
			resolve(index > -1 ? store.users[index] : undefined);
			done();
		},
	};

	rx(
		Promise.all(['users', storage.getItem<User[]>('users')] as const),
		toUsers
	).subscribe(usersObserver);
}

type UserByIdTask = {
	kind: 1;
	id: User['id'];
	resolve: (user: User | undefined) => void;
	reject: (error: Error) => void;
};

type UserByEmailTask = {
	kind: 2;
	email: User['email'];
	resolve: (user: User | undefined) => void;
	reject: (error: Error) => void;
};

type InsertUserTask = {
	kind: 3;
	email: User['email'];
	password: string;
	resolve: (user: User | undefined) => void;
	reject: (error: Error) => void;
};

function runInsertUser(task: InsertUserTask, done: () => void) {
	const error = (err: Error) => {
		task.reject(err);
		done();
	};
	const failed = () => {
		task.resolve(undefined);
		done();
	};

	const userObserver = {
		error,
		next: (user: User) => {
			task.resolve(user);
			done();
		},
	};

	const userStoreObserver = {
		error,
		next: (store: FromUserStore) => {
			const userIndex = findUserByEmail(store.users, task.email);
			if (userIndex > -1) {
				// user with email already exists
				failed();
				return;
			}

			const newUser: AppendNewUser = {
				users: store.users,
				authns: store.authns,
				email: task.email,
				password: task.password,
			};

			rx(
				new Observable((observer: Observer<AppendNewUser>) => {
					observer.next(newUser);
					observer.complete();
				}),
				appendNewUser
			).subscribe(userObserver);
		},
	};

	rx(
		Promise.all([
			'user-store',
			storage.getItem<User[]>('users'),
			storage.getItem<Authn[]>('authns'),
		] as const),
		toUserStore
	).subscribe(userStoreObserver);
}

type Task = InsertUserTask | UserByIdTask | UserByEmailTask | VerifyLoginTask;

let scheduled = false;
let currentIndex = -1;
const tasks: Task[] = [];

function runTasks() {
	currentIndex += 1;

	if (currentIndex >= tasks.length) {
		// No more tasks
		tasks.length = 0;
		currentIndex = -1;
		scheduled = false;
		return;
	}

	const task = tasks[currentIndex];
	switch (task.kind) {
		case 0: {
			runVerifyLogin(task, runTasks);
			return;
		}

		case 1: {
			runUserByPredicate(
				task.resolve,
				task.reject,
				(user: User) => user.id == task.id,
				runTasks
			);
			return;
		}

		case 2: {
			runUserByPredicate(
				task.resolve,
				task.reject,
				(user: User) => user.email == task.email,
				runTasks
			);
			return;
		}

		case 3: {
			runInsertUser(task, runTasks);
			return;
		}
	}
}

function queueTask(task: Task) {
	tasks.push(task);
	if (scheduled) return;

	scheduled = true;
	queueMicrotask(runTasks);
}

function insertUser(email: User['email'], password: string) {
	return new Promise<User | undefined>((resolve, reject) => {
		queueTask({ kind: 3, email, password, resolve, reject });
	});
}

function selectUserByEmail(email: User['email']) {
	return new Promise<User | undefined>((resolve, reject) => {
		queueTask({ kind: 2, email, resolve, reject });
	});
}

function selectUserById(id: User['id']) {
	return new Promise<User | undefined>((resolve, reject) => {
		queueTask({ kind: 1, id, resolve, reject });
	});
}

function verifyLogin(email: User['email'], password: string) {
	return new Promise<User | undefined>((resolve, reject) => {
		queueTask({ kind: 0, email, password, resolve, reject });
	});
}

export { insertUser, selectUserByEmail, selectUserById, verifyLogin };
