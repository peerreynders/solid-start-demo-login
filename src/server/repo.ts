import { readFile, writeFile } from 'node:fs/promises';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { content } from './seed';

import type { Data, Password, /*‡ Todo, */ User } from './types';

type Index = {
	userById: Map<string, User>;
	userByEmail: Map<string, { user: User; password: Password }>;
	//‡ todosByUserId: Map<string, Todo[]>;
};

type Info = {
	data: Data;
	index: Index;
};

// Note: A task is synchronous
type Task<T> = (info: Info) => T;

const SAVE_DELAY = 500;

declare global {
	// eslint-disable-next-line no-var
	var __devRepo__:
		| {
				info: Info;
				path: string;
		  }
		| undefined;
}

let saveSubmitted = false;
let saveId: ReturnType<typeof setTimeout> | undefined;
let queuedId: ReturnType<typeof setTimeout> | undefined;
const taskQueue: Task<unknown>[] = [];

async function writeRepo() {
	if (!__devRepo__) return;

	const path = __devRepo__.path;
	const data = JSON.stringify(__devRepo__.info.data, null, 2);
	return writeFile(path, data, {
		encoding: 'utf8',
		flag: 'w',
	});
}

/* --- Sync Functions --- */

// i.e. don't make them async

function runQueue() {
	if (typeof __devRepo__ === 'undefined') throw new Error('Store not loaded');

	queuedId = undefined;

	for (const runTask of taskQueue) {
		runTask(__devRepo__.info);
	}
	// truncate task queue
	taskQueue.length = 0;
}

function scheduleQueue() {
	if (typeof queuedId !== 'undefined') return;
	queuedId = setTimeout(runQueue);
}

function saveRepoFn(_info: unknown) {
	saveSubmitted = false;

	if (typeof __devRepo__ === 'undefined')
		throw new Error('Save on absent Database');
	// this is async
	writeRepo();
}

function submitSave() {
	saveSubmitted = true;
	saveId = undefined;
	submitTask(saveRepoFn);
}

function scheduleSave() {
	if (saveSubmitted) return;

	if (typeof saveId !== 'undefined') {
		// delay the save
		clearTimeout(saveId);
	}
	saveId = setTimeout(submitSave, SAVE_DELAY);
}

/* --- END Sync functions --- */

function waitForRepo(): Promise<Info> {
	return new Promise((resolve, reject) => {
		let i = 10;
		const wait = () => {
			if (typeof __devRepo__ !== 'undefined') {
				resolve(__devRepo__.info);
			} else {
				--i;
				if (i > 0) setTimeout(wait, 50);
				else reject(new Error('waitForStore: Timed out'));
			}
		};

		wait();
	});
}

function submitTask<T = void>(task: Task<T>): Promise<T> {
	const p = new Promise<T>((resolve, reject) => {
		const runTask = (info: Info) => {
			try {
				resolve(task(info));
			} catch (error) {
				reject(error);
			}
		};

		taskQueue.push(runTask);
	});

	scheduleQueue();
	return p;
}

async function startRepo(
	path: string,
	indexer: (d: Data) => Index,
	seedData: () => Promise<Data>
) {
	let data: Data | undefined;
	let save = false;

	try {
		const result = await readFile(path, 'utf8');
		data = JSON.parse(result);
	} catch (e: unknown) {
		if (((e as NodeJS.ErrnoException)?.code ?? '') === 'ENOENT') {
			data = await seedData();
			save = true;
		} else {
			const message =
				e instanceof Error ? e.message : e == undefined ? 'na' : e.toString();
			console.error(`Error: startStore (${path}):`, message);
		}
	}

	if (typeof data !== 'undefined') {
		const index = indexer(data);
		globalThis.__devRepo__ = {
			info: {
				data,
				index,
			},
			path,
		};

		if (save) submitSave();
	}
}

async function waitForTask<T>(task: Task<T>): Promise<T> {
	if (typeof __devRepo__ === 'undefined') {
		await waitForRepo();
	}
	return submitTask(task);
}

/* --- Application specific --- */

const FILENAME = 'demo-persisted.json';

const makeUser = (email: string): User => ({
	id: nanoid(),
	email,
});

const makePassword = (userId: string, hash: string): Password => ({
	userId,
	hash,
});

const hashPassword = (password: string) => bcrypt.hash(password, 10);

/*‡ const makeTodo = (
	userId: string,
	title: string,
	complete = false,
	createdAt = Date.now()
): Todo => ({
	id: nanoid(),
	userId,
	title,
	complete,
	createdAt,
	updatedAt: createdAt,
}); */

async function fromSeed(): Promise<Data> {
	const init: {
		users: User[];
		//‡		todos: Todo[];
		hashes: Promise<string>[];
	} = {
		users: [],
		//‡		todos: [],
		hashes: [],
	};

	const appendRecord = (
		records: typeof init,
		[email, password /*‡, todoList */]: [
			string,
			string /*‡, [string, boolean, string][] */
		]
	) => {
		const user = makeUser(email);
		records.users.push(user);
		records.hashes.push(hashPassword(password));

		/*‡ todoList.reduce((todos, [title, complete, created]) => {
			const createdAt = new Date(created).getTime();
			todos.push(makeTodo(user.id, title, complete, createdAt));
			return todos;
		}, records.todos); */

		return records;
	};

	const { users, /*‡ todos, */ hashes } = content.reduce(appendRecord, init);

	const appendPassword = (
		passwords: Password[],
		result: PromiseSettledResult<string>,
		index: number
	) => {
		if (result.status === 'fulfilled')
			passwords.push(makePassword(users[index].id, result.value));

		return passwords;
	};

	const passwords = (await Promise.allSettled(hashes)).reduce(
		appendPassword,
		[]
	);

	return {
		users,
		//‡ todos,
		passwords,
	};
}

function indexer(data: Data): Index {
	const userById = new Map(data.users.map((user) => [user.id, user]));

	const userByEmail = data.passwords.reduce((map, password) => {
		const user = userById.get(password.userId);
		return user ? map.set(user.email, { user, password }) : map;
	}, new Map<string, { user: User; password: Password }>());

	/*‡ const todosByUserId = data.todos.reduce((map, todo) => {
		const list = map.get(todo.userId);

		if (list) list.push(todo);
		else map.set(todo.userId, [todo]);

		return map;
	}, new Map<string, Todo[]>()); */

	return {
		userById,
		userByEmail,
		//‡		todosByUserId,
	};
}

const start = async () =>
	globalThis.__devRepo__ ? undefined : startRepo(FILENAME, indexer, fromSeed);

function insertUserFn(info: Info, email: User['email'], passwordHash: string) {
	if (info.index.userByEmail.has(email)) return undefined;

	const user = makeUser(email);
	const password = makePassword(user.id, passwordHash);

	info.data.users.push(user);
	info.data.passwords.push(password);

	scheduleSave();

	info.index.userById.set(user.id, user);
	info.index.userByEmail.set(user.email, {
		user,
		password,
	});
	//‡ info.index.todosByUserId.set(user.id, []);

	return user;
}

// User (Password)
function selectUserByEmailFn(info: Info, email: User['email']) {
	const result = info.index.userByEmail.get(email);
	return result?.user;
}

const selectUserByIdFn = (info: Info, userId: User['id']) =>
	info.index.userById.get(userId);

const selectUserPasswordFn = (info: Info, email: User['email']) =>
	info.index.userByEmail.get(email);

async function insertUser(
	email: User['email'],
	password: string
): Promise<User | undefined> {
	const hash = await hashPassword(password);
	return waitForTask((info: Info) => insertUserFn(info, email, hash));
}

const selectUserByEmail = async (
	email: User['email']
): Promise<User | undefined> =>
	waitForTask((info: Info) => selectUserByEmailFn(info, email));

const selectUserById = async (userId: User['id']): Promise<User | undefined> =>
	waitForTask((info: Info) => selectUserByIdFn(info, userId));

async function verifyLogin(
	email: User['email'],
	password: string
): Promise<User | undefined> {
	const result = await waitForTask((info: Info) =>
		selectUserPasswordFn(info, email)
	);
	if (!result) return undefined;

	const isMatch = await bcrypt.compare(password, result.password.hash);
	return isMatch ? result.user : undefined;
}

export { insertUser, selectUserByEmail, selectUserById, start, verifyLogin };
