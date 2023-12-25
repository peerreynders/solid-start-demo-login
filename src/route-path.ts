const homeHref = '/';

function loginHref(redirectTo?: string) {
	const href = '/login';
	if (!redirectTo || redirectTo === homeHref) return href;

	const searchParams = new URLSearchParams([['redirect-to', redirectTo]]);
	return `${href}?${searchParams.toString()}`;
}

const logoutHref = '/logout';

export { homeHref, loginHref, logoutHref };
