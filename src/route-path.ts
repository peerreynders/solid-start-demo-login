const homeHref = '/';

function loginHref(redirectTo?: string) {
	const href = '/login';
	if (!redirectTo || redirectTo === homeHref) return href;

	const searchParams = new URLSearchParams([['redirect-to', redirectTo]]);
	return `${href}?${searchParams.toString()}`;
}

const logoutHref = '/logout';

function pathAbsolute(url: URL) {
	const start = url.href.indexOf(url.pathname, url.origin.length);
	return url.href.slice(start);
}

export { homeHref, loginHref, logoutHref, pathAbsolute };
