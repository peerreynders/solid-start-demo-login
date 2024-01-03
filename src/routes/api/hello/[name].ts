import type { APIHandler } from '@solidjs/start/server';
import { insertUser, selectUserByEmail, selectUserById, verifyLogin } from '~/server/repo';

export const GET: APIHandler = async ({ params }) => {
	verifyLogin('johnsmith@outlook.com', 'J0hn5M1th').then((user) => console.log(user));
	verifyLogin('kody@gmail.com', 'twixrox').then((user) => console.log(user));
	verifyLogin('kody@gmail.com', 'twixrx').then((user) => console.log('undefined?:', user));
	selectUserById('AC3wvetqX45fYsIxxxCEl').then((user) => console.log(user));
	selectUserById('rsNTX8PuEjpumJ7KNgSKF').then((user) => console.log(user));
	selectUserByEmail('johnsmith@outlook.com').then((user) => console.log(user));
	selectUserByEmail('kody@gmail.com').then((user) => console.log(user));
	insertUser('johnsmith@outlook.com', 'XXX').then((user) => console.log(user));
	//insertUser('newguy@example.com', '53Cr3Tm355ag3').then((user) => console.log(user));
	verifyLogin('newguy@example.com', '53Cr3Tm355ag3').then((user) => console.log(user));
  return `Hello ${params.name}!`;
}
