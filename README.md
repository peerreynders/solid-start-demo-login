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
