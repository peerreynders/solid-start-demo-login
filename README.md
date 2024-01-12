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

### Server Middleware
