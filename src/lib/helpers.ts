// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#basic_validation
const emailPattern =
	/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const validateEmail = (email: unknown): email is string =>
	typeof email === 'string' && emailPattern.test(email);

export { validateEmail };
