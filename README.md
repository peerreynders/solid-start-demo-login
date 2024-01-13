# SolidStart Demo Login

**[Updated for Beta 2](https://github.com/solidjs/solid-start#user-content-start-has-just-entered-a-new-beta-phase)**

Seed project with simple, quick file-based user handling and a login page intended for demonstration projects (i.e. not for production use).

---

```shell
$ cd solid-start-demo-login                                                                                 
solid-start-demo-login$ cp .env.example .env                                                               
solid-start-demo-login$ pnpm install

Lockfile is up to date, resolution step is skipped       [13/896]
Packages: +621                        
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 621, reused 617, downloaded 0, added 621, done

dependencies:
+ @solidjs/meta 0.29.3
+ @solidjs/router 0.10.8
+ @solidjs/start 0.4.6
+ @types/bcryptjs 2.4.6
+ bcryptjs 2.4.3
+ h3 1.9.0
+ nanoid 5.0.4
+ rxjs 8.0.0-alpha.13
+ solid-js 1.8.10
+ unstorage 1.10.1
+ vinxi 0.1.1

devDependencies:
+ @types/node 20.10.6
+ @typescript-eslint/eslint-plugin 6.17.0
+ @typescript-eslint/parser 6.17.0
+ eslint 8.56.0
+ eslint-config-prettier 9.1.0
+ prettier 3.1.1
+ typescript 5.3.3

Done in 1.7s
solid-start-demo-login$ pnpm run dev

> login@ dev solid-start-demo-login
> vinxi dev

vinxi 0.1.1
The CJS build of Vite's Node API is deprecated. See https://vitejs.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
vinxi Found vite.config.js with app config
vinxi starting dev server

  ➜ Local:    http://localhost:3000/
  ➜ Network:  use --host to expose

solid-start-demo-login$
```
Once started users (`johnsmith@outlook.com`/`J0hn5M1th`) and (`kody@gmail.com`/`twixroxz`) have been seeded.

---

- [User Authentication](#user-authentication)
  - [Session Storage](#session-storage)
  - [Server Middleware](#server-middleware)  

## User Authentication

### Session Storage

Once a user has been successfully authenticated that authentication is maintained on the server across multiple client requests with the [`Set-Cookie`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) header.
SolidStart leverages `unjs/h3`'s [session API](https://github.com/unjs/h3?tab=readme-ov-file#session); the documentation focuses on [`useSession()`](https://start.solidjs.com/advanced/session#sessions) specifically which returns a wrapper with `update` and `clear` methods. Here we opt to use the `getSession()`, `updateSession()` and `clearSession` working with the raw [`Session<T>` interface](https://github.com/unjs/h3/blob/ae91fc8658315dca75da22b665eda4175eef7ea8/src/utils/session.ts#L8-L15).

```TypeScript
type SessionDataT = Record<string, any>;
type SessionData<T extends SessionDataT = SessionDataT> = T;

export interface Session<T extends SessionDataT = SessionDataT> {
  id: string;
  createdAt: number;
  data: SessionData<T>;
}
```
The `SessionRecord` type is slotted onto the `data` property. `userId` uniquely identifies a user (for the lifetime of the user record in the persistent store). `userId` is optional as `getSession()` will create a new, empty session when the appropriate cookie isn't on the request; i.e. a fresh session doesn't have an `userId` already. The `userId` is only added with `updateSession()`.  

The [IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE) instantiates the two alternate configurations; the default configuration `config` creates a [session cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#session_cookie) while `configRemember` leads to a “permanent cookie” that the browser retains for 7 days (unless the user signs out). The configuration is chosen during the sign in with the “Remember” checkbox.

```TypeScript
// file: src/server/session.ts
import {
  clearSession as clear,
  deleteCookie,
  getSession,
  updateSession,
} from '@solidjs/start/server';

import type { RequestEvent } from 'solid-js/web';
import type { Session, SessionConfig } from '@solidjs/start/server';
import type { User } from '../types';

export type SessionRecord = {
  userId?: string | undefined;
};

const USER_SESSION_NAME = '__session';
const USER_SESSION_KEY = 'userId';
const USER_SESSION_MAX_AGE = 604800; // 7 days

const [config, configRemember]: [SessionConfig, SessionConfig] = (() => {
  if (
    typeof process.env.SESSION_SECRET !== 'string' ||
    process.env.SESSION_SECRET.length < 32
  )
    throw Error('SESSION_SECRET must be set and at least 32 characters long');

  // $ head -c32 /dev/urandom | base64

  const config: SessionConfig = {
    cookie: {
      // domain?: string | undefined
      // encode?: (value: string) => string
      // expires?: Date | undefined
      httpOnly: true,
      // maxAge?: number | undefined
      path: '/',
      // priority?: "low" | "medium" | "high" | undefined
      sameSite: 'lax',
      secure: true,
    },
    password: process.env.SESSION_SECRET,
    // maxAge?: number | undefined used to set `expires` on cookie
    name: USER_SESSION_NAME,
  };
  // see unjs/h3 and unjs/cookie-es documentation

  return [
    config,
    { ...config, cookie: { ...config.cookie, maxAge: USER_SESSION_MAX_AGE } },
  ];
})();

const selectConfig = (remember: boolean | undefined) =>
  remember === true ? configRemember : config;

// … 
```
`renewSession()` is used to put the `userId` of the recently authenticated user into the cookie (to be returned to the browser in the response to the login/signup action).
```TypeScript
// … 

async function renewSession(
  event: RequestEvent,
  user: User,
  maybeRemember?: boolean | undefined
) {
  event.locals.user = user;

  const userId = user.id
  const sessionConfig = selectConfig(maybeRemember);
  await updateSession(
    event,
    sessionConfig,
    (_record) => ({ userId }) 
  );
}:

// … 
```
Note that the `user` is stashed on the `RequestEvent`'s `locals` object. That way it can be accessed synchronously during the current request with `userFromRequestEvent()` and `userFromSession()`.
```TypeScript
// file: src/server/types.ts

// … 

type RequestLocal = {
  user?: User | undefined;
};

declare module 'solid-js/web' {
  interface RequestEvent {
    locals: RequestLocal;
  }
}
```
`clearSession()` clears the session data and removes the cookie that held it.


```TypeScript
// file: src/server/session.ts

// … 

function clearSession(event: RequestEvent) {
  // h3 `clearSession` only clears the cookie
  // data but doesn't remove the cookie itself
  return clear(event, config).then(() =>
    deleteCookie(event, USER_SESSION_NAME)
  );
}

const sessionUserId = (session: Session<SessionRecord>) =>
  session.data[USER_SESSION_KEY];

// … 
```

`sessionUserId()` can be used to opaquely retrieve the `userId` from a raw session. 

The server side functionality that the server actions are based on is found mostly in `src/api/server.ts`. 

```TypeScript
// file: src/api/server.ts
'use server';

// … 

function signOut(event: RequestEvent) {
  const { user: _user, ...rest } = event.locals;
  event.locals = rest;
  return clearSession(event);
}

async function signOutFn() {
  const event = getRequestEvent();
  if (!event) throw Error('Unable to access logout request');

  await signOut(event);

  throw redirect('/login');
}

// … 
```

`signOut()` removes the session cookie from the pending response of the current request and also removes the authenticated `user` from the request's `locals` object. `signOutFn()` wraps `signOut()` as an `async function` for an [`action`](https://github.com/solidjs/solid-router/blob/a3493b23a9d93bbe305a2972cf63d4d4973e163a/README.md#action)

```TypeScript
// … 

function forceToString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

async function signInFn(form: FormData) {
  const email = forceToString(form, 'email');
  const password = forceToString(form, 'password');
  const kind = forceToString(form, 'kind');

  if (!validateEmail(email)) return makeSignInError('email-invalid', kind);

  if (password.length < 1) return makeSignInError('password-missing', kind);
  if (password.length < 8) return makeSignInError('password-short', kind);

  if (kind === 'signup') {
    const found = await selectUserByEmail(email);
    if (found) return makeSignInError('email-exists', kind);
  } else if (kind !== 'login') return makeSignInError('kind-unknown', kind);

  const user = await (kind === 'login'
    ? verifyLogin(email, password)
    : insertUser(email, password));

  if (!user) return makeSignInError('user-invalid', kind);

  const event = getRequestEvent();
  // Note: Server Side Error
  if (!event) throw new Error('Unable to access request');

  const redirectValue = form.get('redirect-to');
  const redirectTo =
    typeof redirectValue === 'string' ? redirectValue : homeHref;
  const remember = form.get('remember') === 'on';

  await renewSession(event, user, remember)
  throw redirect(redirectTo);
}

function getUserSync() {
  const event = getRequestEvent();
  if (!event) return undefined;
  return userFromRequestEvent(event);
}

// … 
```

`getUserSync()` retrieves the `User` (if present) from the request's `locals` object (see also: [Server Middleware](#server-middleware)). 

`signInFn()`validates the values present within the form data. For logins, the user/password is verified, for sign ups, the user/password is inserted into the persistent store. After the successful login/sign up a session cookie with the `userId` is added to the request's response. Finally a [`redirect`](https://github.com/solidjs/solid-router/blob/a3493b23a9d93bbe305a2972cf63d4d4973e163a/README.md#redirectpath-options) is **thrown** (while client-bound errors are returned; internal server errors are still thrown) to the orignally intended route path.

The various errors that can occur during sign in are discriminated by the `SignInErrorKind` union of literals. `SignInFieldErrors` holds the error message in reference to the appropriate field. `SignInFieldErrors` is wrapped by the `SignInError` class which `is-a` `Error`.

```TypeScript
// … 

type SignInErrorKind =
  | 'email-invalid'
  | 'email-exists'
  | 'password-missing'
  | 'password-short'
  | 'user-invalid'
  | 'kind-unknown';

type SignInFieldErrors = {
  email?: string;
  password?: string;
};

class SignInError extends Error {
  errors: SignInFieldErrors;

  constructor(message: string, errors: SignInFieldErrors) {
    super(message);
    this.errors = errors;
  }
}

function makeSignInError(errorKind: SignInErrorKind, signInKind: string) {
  let message = 'Form not submitted correctly.';
  const errors: SignInFieldErrors = Object.create(null);

  switch (errorKind) {
    case 'email-invalid':
      message = errors.email = 'Email is invalid';
      break;

    case 'email-exists':
      message = errors.email = 'A user already exists with this email';
      break;

    case 'user-invalid':
      message = errors.email = 'Invalid email or password';
      break;

    case 'password-missing':
      message = errors.password = 'Password is required';
      break;

    case 'password-short':
      message = errors.password = 'Password is too short';
      break;

    case 'kind-unknown':
      message = `Unknown kind: ${signInKind}`;
      break;

    default: {
      const _exhaustiveCheck: never = errorKind;
      return _exhaustiveCheck;
    }
  }

  return new SignInError(message, errors);
}

// … 
```

`makeSignInError()` prepares the constructor arguments before creating a `SignInError` instance.

`src/api/index.ts` packages the appropriate server [actions](https://github.com/solidjs/solid-router/blob/a3493b23a9d93bbe305a2972cf63d4d4973e163a/README.md#action) and [functions](https://github.com/solidjs/solid-router/blob/a3493b23a9d93bbe305a2972cf63d4d4973e163a/README.md#cache) for consumption by the client.

```TypeScript
// file: src/api/index.ts
import { action, cache } from '@solidjs/router';
import { getUserSync, signInFn, signOutFn } from './server';

import type { MaybeUser } from '../lib/user';

const getUser = cache<() => Promise<MaybeUser>, Promise<MaybeUser>>(
  async () => {
  'use server'
  return getUserSync();
  },
  'user'
);

const signOut = action(signOutFn, 'sign-out');
const signIn = action(signInFn, 'sign-in');

// functions allowed while unauthenticated
// `$$function0` originates from `vinxi-directives/plugins/wrap-exports.js`: presumably `getUser`
const allowedFnName = ['$$function0', 'signInFn', 'signOutFn'];
const isAllowedFnName = (fnName: string) => allowedFnName.includes(fnName);

export { isAllowedFnName, getUser, signIn, signOut };
```

### Server Middleware

For `getUserSync()` to work the `User` has to be already in the request's [`locals`](https://github.com/solidjs/solid-start/blob/a670ffa3c498af6d16f44a4156edaca9d1fbc155/packages/start/server/types.ts#L44):

```TypeScript
//  @solidjs/server/types
// … 

interface FetchEvent extends H3Event<EventHandlerRequest> {
  request: Request;
  clientAddress: string;
  locals: Record<string, unknown>;
}

// … 

declare module "solid-js/web" {
  interface RequestEvent extends FetchEvent {
    serverOnly?: boolean;
  }
}

// file: src/server/types.ts

// … 

type RequestLocal = {
  user?: User | undefined;
};

declare module 'solid-js/web' {
  interface RequestEvent {
    locals: RequestLocal;
  }
}
```

The `User` is placed by [middleware](https://start.solidjs.com/advanced/middleware) which has to be injected with the `middleware` option of the `start` configuration:

```TypeScript
// file: vite.config.ts
import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  start: {
    middleware: 'src/middleware.ts',
    ssr: true,
  }
});
```

The middleware itself only allows unauthenticated access to the `/login` route, all others are treated as protected (including any route that will result in [`404 Not Found`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404)) and will be redirected to `/login` the session cookie doesn't exists or `userId` can't be identified:

```TypeScript
import {
  createMiddleware,
  getCookie,
  getRequestHeaders,
  sendRedirect,
} from '@solidjs/start/server';
import {
  sessionFromEvent,
  sessionUserId,
  USER_SESSION_NAME,
} from './server/session';
import { isAllowedFnName } from './api';
import { signOut } from './api/server';
import { selectUserById } from './server/repo';
import { homeHref, loginHref, logoutHref, pathAbsolute } from './route-path';

import type { RequestEvent } from 'solid-js/web';
import type { RequestHeaders } from '@solidjs/start/server';

function isAllowedFn(headers: RequestHeaders) {
  // leverage vinxi header
  const serverFnId = headers['x-server-id'];
  if (!serverFnId) return false;

  const fragmentAt = serverFnId.lastIndexOf('#');
  if (fragmentAt < 0) return false;

  const fnName = serverFnId.slice(fragmentAt + 1);
  return isAllowedFnName(fnName);
}

async function redirectWhenNotAuthenticated(event: RequestEvent) {
  const login = loginHref();
  const url = new URL(event.request.url);
  const route = url.pathname;
  if (route === logoutHref) {
    // Perform logout and goto login screen
    await signOut(event);
    return sendRedirect(event, login);
  }

  const cookie = getCookie(event, USER_SESSION_NAME);
  if (cookie) {
    const session = await sessionFromEvent(event);
    const userId = sessionUserId(session);
    if (userId) {
      const user = await selectUserById(userId);
      if (user) {
        // AUTHENTICATED
        event.locals.user = user;
        if (route === login) return sendRedirect(event, homeHref);

        return;
      }
    }
  }

  let headers: RequestHeaders | undefined;
  const getHeaders = () => headers ? headers : getRequestHeaders(event);

  if (route === '/_server') {
    if(isAllowedFn(getHeaders())) return;

    return sendRedirect(event, login);
  }

  // need to authenticate
  if (route !== login) return sendRedirect(event, loginHref(pathAbsolute(url)));
}

export default createMiddleware({
  onRequest: [redirectWhenNotAuthenticated],
  onBeforeResponse: [],
});
```

`/_server` is used for server actions and functions; vinxi's `x-server-id` header contains the URI that uniquely identifies the function. The fragment identifier is the name of the server function (the rest acts a the module identifier; unfortunately functions emitted by `cache` are anonymous so they are assigned a generated name like `$$function0`). In this context it is sufficient to identify the function by name. Only server functions with their name in `allowedFnName` are processed without authentication.

A `User` is assumed to have been previously authenticated when the `userId` in the `SessionRecord` referenced by the `__session` cookie exists in the persistent store.

