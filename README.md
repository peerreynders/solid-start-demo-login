# SolidStart Demo Login
Seed project extracted from [SolidStart TodoMVC](https://github.com/peerreynders/solid-start-todomvc-kcd-v2) with simple, quick in-memory user handling and a login page intended for demonstration projects (i.e. not for production use).

---

```shell
$ cd solid-start-demo-login
$ cp .env.example .env
$ npm i

added 451 packages, and audited 452 packages in 3s

56 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
$ npm run build

> solid-start-demo-login@0.0.0 build
> solid-start build

 solid-start build 
 version  0.2.23
 adapter  node

solid-start building client...
vite v4.2.1 building for production...
✓ 59 modules transformed.
Inspect report generated at solid-start-demo-login/.solid/inspect
dist/public/manifest.json                     0.83 kB
dist/public/ssr-manifest.json                 1.94 kB
dist/public/assets/_...404_-d57f2e83.js       0.56 kB │ gzip:  0.38 kB
dist/public/assets/index-086cbc74.js          0.76 kB │ gzip:  0.48 kB
dist/public/assets/login-0733d077.js          6.69 kB │ gzip:  2.75 kB
dist/public/assets/entry-client-ec049f4b.js  39.48 kB │ gzip: 15.13 kB
✓ built in 1.33s
solid-start client built in: 1.368s

solid-start building server...
vite v4.2.1 building SSR bundle for production...
✓ 63 modules transformed.
Inspect report generated at solid-start-demo-login/.solid/inspect
.solid/server/manifest.json     0.12 kB
.solid/server/entry-server.js  86.31 kB
✓ built in 820ms
solid-start server built in: 846.919ms

$ npm start

> solid-start-demo-login@0.0.0 start
> solid-start start

 solid-start start 
 version  0.2.23
 adapter  node


  ➜  Page Routes:
     ┌─ http://localhost:3000/*404
     ├─ http://localhost:3000/
     └─ http://localhost:3000/login

  ➜  API Routes:
     None! 👻

Listening on port 3000

```
**Note**: The in-memory server side store re-seeds itself (johnsmith@outlook.com J0hn5M1th) whenever the `demo-persisted.json` file cannot be found.

---

- [User Authentication](#user-authentication)
  - [Session Storage](#session-storage)
  - [Server Middleware](#server-middleware)
  - [User Context](#user-context)
  - [Login Page](#login-page)
    - [`makeLoginSupport`](#makeloginsupport)
    - [Login function (server side)](#login-function-server-side)

## User Authentication

### Session Storage

Once a user has been successfully authenticated that authentication is maintained on the server across multiple client requests with the [`Set-Cookie`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) header.
In SolidStart that (cookie) session storage is created with [`createCookieSessionStorage`](https://start.solidjs.com/api/createCookieSessionStorage).

```TypeScript
// file: src/server/session.ts

if (!process.env.SESSION_SECRET) throw Error('SESSION_SECRET must be set');

const storage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secure: process.env.NODE_ENV === 'production',
    secrets: [process.env.SESSION_SECRET],
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    httpOnly: true,
  },
});

const fromRequest = (request: Request): Promise<Session> =>
  storage.getSession(request.headers.get('Cookie'));

const USER_SESSION_KEY = 'userId';
const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function createUserSession({
  request,
  userId,
  remember,
  redirectTo,
}: {
  request: Request;
  userId: User['id'];
  remember: boolean;
  redirectTo: string;
}): Promise<Response> {
  const session = await fromRequest(request);
  session.set(USER_SESSION_KEY, userId);

  const maxAge = remember ? USER_SESSION_MAX_AGE : undefined;
  const cookieContent = await storage.commitSession(session, { maxAge });

  return redirect(safeRedirect(redirectTo), {
    headers: {
      'Set-Cookie': cookieContent,
    },
  });
}
```

The `SESSION_SECRET` used by the session storage is kept in a `.env` file, e.g.:
```
# file: .env
SESSION_SECRET="Xe005osOAE8ZRMDReizQJjlLrrs=" 
```

so that in [Node.js](https://nodejs.org/) it can be read with [`process.env`](https://nodejs.org/dist/latest-v8.x/docs/api/process.html#process_process_env).

Some of the `cookie` (default) options:
- `name` sets the the cookie [name/key](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#cookie-namecookie-value).
- `Max-Age=0` [expires](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#max-agenumber) the cookie immediately ([overridden](#cookie-age) during `storage.commitSession(…)`).
- `HttpOnly=true` [forbids](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#httponly) JavaScript from accessing the cookie.

The cookie is returned in a [Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie) header on request the follow a response with the [`Set-Cookie`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) header.
Consequently it can be accessed on the server via the [`Headers`](https://developer.mozilla.org/en-US/docs/Web/API/Headers) object exposed by [`Request.headers`](https://developer.mozilla.org/en-US/docs/Web/API/Request/headers) with `request.headers.get('Cookie')`. 

The request's cookie value is used to find/reconstitute the user session (or create a new one) in the server side session storage with `storage.getSession(…)` in `fromRequest`.
`createUserSession(…)` writes the `userId` to the newly created session with `session.set('userId', userId);`; `storage.commitSession(session, { maxAge })` commits the session to storage while generating a cookie value for the `Set-Cookie` response header that makes it possible to find/reconstitute the server side user session on the next request.  

<a name="cookie-age"></a>
`maxAge` will either be 7 days ([permanent cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#permanent_cookie)) or (if `undefined`) create a [session cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#session_cookie) which is removed once the browser terminates.

Finally [`redirect(…)`](https://start.solidjs.com/api/redirect) is used to move to the next address and to attach the `Set-Cookie` header to the response.


`storage.destroySession(…)` is used purge the user session. 
Again it generates the cookie content to be set with a `Set-Cookie` header in the response.
Cookies are typically deleted by the server by setting its [`Expires`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#expiresdate) attribute to the [ECMAScript Epoch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#the_ecmascript_epoch_and_timestamps) (or any other date in the past): 

<details><summary>code</summary>

```TypeScript
const formatter = Intl.DateTimeFormat(['ja-JP'], {
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
});
const epoch = new Date(0);
console.log(epoch.toISOString());     // 1970-01-01T00:00:00.000Z
console.log(formatter.format(epoch)); // 1970/01/01 00:00:00 UTC
```

</details>

or by setting the [`Max-Age`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#max-agenumber) attribute to zero or a negative number. The `logout` function uses this to purge the user session cookie from the browser ([caveat](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#sect3)).


```TypeScript
// file: src/server/session.ts

async function logout(request: Request, redirectTo = loginHref()) {
  const session = await fromRequest(request);
  const cookieContent = await storage.destroySession(session);

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': cookieContent,
    },
  });
}

```

### Server Middleware

Once the user session cookie exists in the request there is an opportunity to make the session values easily available to most server side code. Server [middleware](https://start.solidjs.com/advanced/middleware) is passed a [`FetchEvent`](https://github.com/solidjs/solid-start/blob/121d45d27be519bad3e2fc9f9c895dc64f7a0d3d/packages/start/server/types.tsx#L59-L64) which contains among other things the `request` but also a `locals` collection.

In this case `getUser(…)` is used to extract the user ID from the request cookie which is then used to retrieve the remainder of the user information with `selectUserById(…)` from persistent storage:

```TypeScript
// file src/server/session.ts

const getUserId = async (request: Request) =>
  (await fromRequest(request)).get(USER_SESSION_KEY);

async function getUser(request: Request) {
  const userId = await getUserId(request);
  return typeof userId === 'string' ? selectUserById(userId) : undefined;
}
```
That information is then stored for later, synchronous access in `FetchEvent`'s `locals` collection under the `user` key. 

```TypeScript
// file: src/entry-server.tsx

const protectedPaths = new Set([homeHref]);

function userMiddleware({ forward }: MiddlewareInput): MiddlewareFn {
  return async (event) => {
    const loginRoute = loginHref();
    const route = new URL(event.request.url).pathname;
    if (route === logoutHref) return logout(event.request, loginRoute);

    // Attach user to FetchEvent if available
    const user = await getUser(event.request);

    if (!user && protectedPaths.has(route)) return redirect(loginHref(route));

    event.locals['user'] = user;

    return forward(event);
  };
}

export default createHandler(
  userMiddleware,
  renderAsync((event) => <StartServer event={event} />)
);
```

Conversely absense of a `user` value on the `FetchEvent`'s `locals` can be interpreted as the absense of a user session and authentication typically requiring a redirect to the login page.

Some helper functions used:
```TypeScript
// file: src/route-path.ts

const homeHref = '/';

function loginHref(redirectTo?: string) {
  const href = '/login';
  if (!redirectTo || redirectTo === homeHref) return href;

  const searchParams = new URLSearchParams([['redirect-to', redirectTo]]);
  return `${href}?${searchParams.toString()}`;
}

/* … more code … */

```

### User Context

A [`server$`](https://start.solidjs.com/api/server) server side function has access to the `locals` collection via the [`ServerFunctionEvent`](https://github.com/solidjs/solid-start/blob/121d45d27be519bad3e2fc9f9c895dc64f7a0d3d/packages/start/server/types.tsx#L66-L69) that is passed as the [function context](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this#function_context) (TS: [Declaring `this` in a function](https://www.typescriptlang.org/docs/handbook/2/functions.html#declaring-this-in-a-function)):

```TypeScript
// file: src/components/user-context.tsx 

function userFromSession(this: ServerFunctionEvent) {
  return userFromFetchEvent(this);
}
```

```TypeScript
// file: src/server/helpers.ts

const userFromFetchEvent = (event: FetchEvent) =>
  'user' in event.locals && typeof event.locals.user === 'object'
    ? (event.locals.user as User | undefined)
    : undefined;
```

Using [`server$`](https://start.solidjs.com/api/server) the browser can send a request to the server which then returns the user information placed by the [server middleware](#server-middleware) on the `FetchEvent` back to the browser. 

```TypeScript
// file: src/components/user-context.tsx 

const clientSideSessionUser = server$(userFromSession);

const userEquals = (prev: User, next: User) =>
  prev.id === next.id && prev.email === next.email;

const userChanged = (prev: User | undefined, next: User | undefined) => {
  const noPrev = typeof prev === 'undefined';
  const noNext = typeof next === 'undefined';

  // Logical XOR - only one is undefined
  if (noPrev ? !noNext : noNext) return true;

  // Both undefined or User
  return noPrev ? false : !userEquals(prev, next as User);
};

function makeSessionUser(isRouting: () => boolean) {
  let routing = false;
  let toggle = 0;

  const refreshUser = () => {
    const last = routing;
    routing = isRouting();
    if (last || !routing) return toggle;

    // isRouting: false ➔  true transition
    // Toggle source signal to trigger user fetch
    toggle = 1 - toggle;
    return toggle;
  };

  const fetchUser = async (
    _toggle: number,
    { value }: { value: User | undefined; refetching: boolean | unknown }
  ) => {
    const next = await (isServer
      ? userFromFetchEvent(useServerContext())
      : clientSideSessionUser());

    // Maintain referential stability if
    // contents doesn't change
    return userChanged(value, next) ? next : value;
  };

  const [userResource] = createResource<User | undefined, number>(
    refreshUser,
    fetchUser
  );

  return userResource;
}
```

`makeSessionUser(…)` creates a [resource](https://www.solidjs.com/docs/latest#createresource) to (reactively) make the information from the user session available. 
It works slightly differently on server and client based on [`isServer`](https://www.solidjs.com/docs/latest#isserver); on the server (for SSR) `userFromFetchEvent(…)` can be used directly while the client has to access it indirectly via `clientSideSessionUser()`.

The `refreshUser()` [derived signal](https://www.solidjs.com/tutorial/introduction_derived) drives the updates of `userResource` (acting as the [`sourceSignal`](https://www.solidjs.com/docs/latest/api#createresource)). Whenever the route changes (client side) the return value of `refreshUser()` changes (either `0` or `1`) causing the resource to fetch the user information again from the server (in case the route change caused the creation or removal of a user session). 
[`useIsRouting()`](https://start.solidjs.com/api/useIsRouting) can only be used "in relation" to [`Routes`](https://start.solidjs.com/api/Routes), making it necessary to pass in the `isRouting()` signal as a parameter to `makeSessionUser(…)`.

The purpose of the *User Context* is to make the [User](src/server/types.ts) information available page wide without [nested routes](https://start.solidjs.com/core-concepts/routing#nested-routes) having to acquire it separately via their [`routeData`](https://start.solidjs.com/api/useRouteData) function.
So the `userResource` is made accessible by placing it in a [context](https://www.solidjs.com/docs/latest/api#createcontext).

```TypeScript
// file: src/components/user-context.tsx 

const UserContext = createContext<Resource<User | undefined> | undefined>();

export type Props = ParentProps & {
  isRouting: () => boolean;
};

function UserProvider(props: Props) {
  return (
    <UserContext.Provider value={makeSessionUser(props.isRouting)}>
      {props.children}
    </UserContext.Provider>
  );
}

const useUser = () => useContext(UserContext);
```

The [`isRouting()`](https://start.solidjs.com/api/useIsRouting) signal necessary for `makeSessionUser(…)` is injected into the provider, making `userResource` available to all the `children` via the `useUser()` hook.

The `UserProvider` is used in the document entry point (top level layout) [`root.tsx`](https://start.solidjs.com/api/root) to enable the `useUser()` hook in the rest of the document. 

```TypeScript
// file: src/root.tsx 

import { UserProvider } from './components/user-context';

export default function Root() {
  const isRouting = useIsRouting();

  return (
    <Html lang="en">
      <Head>
        <Title>SolidStart Demo login</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/styles.css" rel="stylesheet" />
      </Head>
      <Body>
        <Suspense>
          <ErrorBoundary>
            <UserProvider isRouting={isRouting}>
              <Routes>
                <FileRoutes />
              </Routes>
            </UserProvider>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  );
}
```

### Login Page

#### `makeLoginSupport`

The login functionality uses [forms](https://developer.mozilla.org/en-US/docs/Learn/Forms) furnished by [`createServerAction$(…)`](https://start.solidjs.com/api/createServerAction):

```TypeScript
// file: src/routes/login.tsx 

function makeLoginSupport() {
  const [loggingIn, login] = createServerAction$(loginFn);

  const emailError = () =>
    loggingIn.error?.fieldErrors?.email as string | undefined;
  const passwordError = () =>
    loggingIn.error?.fieldErrors?.password as string | undefined;

  const focusId = () => (passwordError() ? 'password' : 'email');

  return {
    emailError,
    focusId,
    login,
    passwordError,
  };
}
```

`login` is the action dispatcher that exposes the form action while `loggingIn` is an action monitor that reactively tracks submission state. 
The `emailError` and `passwordError` derived signals factor out the two possible action error sources. 
`focusId` is used to determine autofocus which defaults to the email field unless there is a password error. 

Auxiliary functions for the JSX:

```TypeScript
const emailHasError = (emailError: () => string | undefined) =>
  typeof emailError() !== undefined;

const emailInvalid = (emailError: () => string | undefined) =>
  emailError() ? true : undefined;

const emailErrorId = (emailError: () => string | undefined) =>
  emailError() ? 'email-error' : undefined;

const passwordHasError = (passwordError: () => string | undefined) =>
  typeof passwordError() !== undefined;

const passwordInvalid = (passwordError: () => string | undefined) =>
  passwordError() ? true : undefined;

const passwordErrorId = (passwordError: () => string | undefined) =>
  passwordError() ? 'password-error' : undefined;

const hasAutofocus = (id: string, focusId: Accessor<string>) =>
  focusId() === id;
```

The `login` action dispatcher, `emailError`, `passwordError`, and `focusId` signals are exposed to the `LoginPage`. 
A separate [effect](https://www.solidjs.com/docs/latest/api#createeffect) is used to redirect focus on a client side password error.
[`ref`](https://www.solidjs.com/docs/latest/api#ref)s on the respective [`HTMLInputElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement)s are used to support that effect.


There are two different `kind`s of actions: `login` and `signup` (see `button`s).

```TypeScript
// file: src/routes/login.tsx 

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams['redirect-to'] || todosHref;
  const { login, focusId, emailError, passwordError } = makeLoginSupport();

  let emailInput: HTMLInputElement | undefined;
  let passwordInput: HTMLInputElement | undefined;

  createEffect(() => {
    if (focusId() === 'password') {
      passwordInput?.focus();
    } else {
      emailInput?.focus();
    }
  });

  return (
    <div class="c-login">
      <Title>Login</Title>
      <h1 class="c-login__header">TodoMVC Login</h1>
      <div>
        <login.Form class="c-login__form">
          <div>
            <label for="email">Email address</label>
            <input
              ref={emailInput}
              id="email"
              class="c-login__email"
              required
              autofocus={hasAutofocus('email', focusId)}
              name="email"
              type="email"
              autocomplete="email"
              aria-invalid={emailInvalid(emailError)}
              aria-errormessage={emailErrorId(emailError)}
            />
            <Show when={emailHasError(emailError)}>
              <div id="email-error">{emailError()}</div>
            </Show>
          </div>

          <div>
            <label for="password">Password</label>
            <input
              ref={passwordInput}
              id="password"
              class="c-login__password"
              autofocus={hasAutofocus('password', focusId)}
              name="password"
              type="password"
              autocomplete="current-password"
              aria-invalid={passwordInvalid(passwordError)}
              aria-errormessage={passwordErrorId(passwordError)}
            />
            <Show when={passwordHasError(passwordError)}>
              <div id="password-error">{passwordError()}</div>
            </Show>
          </div>
          <input type="hidden" name="redirect-to" value={redirectTo} />
          <button type="submit" name="kind" value="login">
            Log in
          </button>
          <button type="submit" name="kind" value="signup">
            Sign Up
          </button>
          <div>
            <label for="remember">
              <input
                id="remember"
                class="c-login__remember"
                name="remember"
                type="checkbox"
              />{' '}
              Remember me
            </label>
          </div>
        </login.Form>
      </div>
    </div>
  );
}
```

#### Login function (server side)

`loginFn` extracts `kind`, `email`, and `password` from the [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) and subjects them to various validations:

```TypeScript
// file: src/routes/login.tsx 

function forceToString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

async function loginFn(
  form: FormData,
  event: ServerFunctionEvent
) {
  const email = forceToString(form, 'email');
  const password = forceToString(form, 'password');
  const kind = forceToString(form, 'kind');

  const fields = {
    email,
    password,
    kind,
  };

  if (!validateEmail(email))
    throw makeError({ error: 'email-invalid', fields });

  if (password.length < 1)
    throw makeError({ error: 'password-missing', fields });
  if (password.length < 8) throw makeError({ error: 'password-short', fields });

  if (kind === 'signup') {
    const found = await selectUserByEmail(email);
    if (found) throw makeError({ error: 'email-exists', fields });
  } else if (kind !== 'login')
    throw makeError({ error: 'kind-unknown', fields });

  const user = await (kind === 'login'
    ? verifyLogin(email, password)
    : insertUser(email, password));

  if (!user) throw makeError({ error: 'user-invalid', fields });

  const redirectTo = form.get('redirect-to');
  const remember = form.get('remember');
  return createUserSession({
    request: event.request,
    userId: user.id,
    remember: remember === 'on',
    redirectTo: typeof redirectTo === 'string' ? redirectTo : todosHref,
  });
}
```
… which could result in any number of errors which will appear on the corresponding fields:

```TypeScript
type FieldError =
  | 'email-invalid'
  | 'email-exists'
  | 'password-missing'
  | 'password-short'
  | 'user-invalid'
  | 'kind-unknown';

function makeError(data?: {
  error: FieldError;
  fields: {
    email: string;
    password: string;
    kind: string;
  };
}) {
  let message = 'Form not submitted correctly.';
  if (!data) return new FormError(message);

  let error = data.error;
  const fieldErrors: {
    email?: string;
    password?: string;
  } = {};

  switch (error) {
    case 'email-invalid':
      message = fieldErrors.email = 'Email is invalid';
      break;

    case 'email-exists':
      message = fieldErrors.email = 'A user already exists with this email';
      break;

    case 'user-invalid':
      message = fieldErrors.email = 'Invalid email or password';
      break;

    case 'password-missing':
      message = fieldErrors.password = 'Password is required';
      break;

    case 'password-short':
      message = fieldErrors.password = 'Password is too short';
      break;

    case 'kind-unknown':
      return new Error(`Unknown kind: ${data.fields.kind}`);

    default: {
      const _exhaustiveCheck: never = error;
      error = _exhaustiveCheck;
    }
  }

  return new FormError(message, { fields: data.fields, fieldErrors });
}
```
(TS: [Exhaustiveness checking](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking); an `Error` maps to an [500 Internal Server Error](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500) response status while a `FormError` maps to a [400 Bad Request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400) response status)

If all checks are passed `signup` will add the new user while `login` will verify an existing user. 
In either case a user session ([Session Storage](#session-storage)) is created giving access to the home page.

