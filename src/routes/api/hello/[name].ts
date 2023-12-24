import type { APIHandler } from '@solidjs/start/server';
import { verifyLogin } from '~/server/repo';

export const GET: APIHandler = async ({ params }) => {
	verifyLogin();
  return `Hello ${params.name}!`;
};
