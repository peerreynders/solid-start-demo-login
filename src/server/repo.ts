import { createStorage } from 'unstorage';
import fsLiteDriver from 'unstorage/drivers/fs-lite';
import { nanoid } from 'nanoid'; 
import bcrypt from 'bcryptjs';

type User = {
	id: string;
	email: string;
};

type Password = {
	hash: string;
	userId: string;
};

type SeedContent = [
	email: string,
	password: string
	//‡ todos: [title: string, completed: boolean, createdAt: string][]
][];

const content: SeedContent = [
	['johnsmith@outlook.com', 'J0hn5M1th'],
];

const storage = createStorage({
  driver: fsLiteDriver({
    base: ".data"
  })
});

(function () {
	storage.getItem('users').then((data) => {
		if (data) return undefined;

		const source: { id: string, email: string, hash: (string | undefined) }[] = [];
		let remain = content.length;

		for(let i = 0; i < content.length; i += 1) {
			const id = nanoid();
			const [email, password] = content[i];
			source[i] = { id, email, hash: undefined };

		  bcrypt.genSalt(10, (_err, salt) => {
				bcrypt.hash(password, salt, (_err, hash) => {
					source[i].hash = hash;
					remain -= 1;

					if (remain > 1) return;

					console.log(source);
				})
			});	
		}
	});

	//storage.setItem("users:data", [{ id: 0, username: "kody", password: "twixrox" }]);
	console.log('runn');
})();

function verifyLogin() {
	console.log('REPO');
}

export { verifyLogin };
