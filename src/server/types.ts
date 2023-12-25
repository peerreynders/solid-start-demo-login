type User = {
	id: string;
	email: string;
};

type Password = {
	hash: string;
	userId: string;
};

/*‡
type Todo = {
	id: string;
	title: string;
	complete: boolean;
	createdAt: number;
	updatedAt: number;
	userId: string;
};
*/

type Data = {
	users: User[];
	//‡ todos: Todo[];
	passwords: Password[];
};

type SeedContent = [
	email: string,
	password: string
	//‡ todos: [title: string, completed: boolean, createdAt: string][]
][];

export type { Data, Password, SeedContent, /*‡ Todo, */ User };
