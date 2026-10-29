# Version review: bookvie architecture spine (2026-10-29)

Scope: the Stack table in `ARCHITECTURE-SPINE.md` plus the tools named elsewhere in it (TanStack Query, the Vite react-ts template, `uv tool install`).
Method: version data comes from the PyPI JSON API (`pypi.org/pypi/<pkg>/json`), the npm registry (`registry.npmjs.org/<pkg>`, `latest` dist-tag), endoflife.date for Python, the create-vite template `package.json` on GitHub main, and the Pillow 13.0.0 release notes. All were queried on 2026-10-29.

## Versions

| Name | Spine pin | Latest verified (release date) | Status | Source | Recommended pin |
|---|---|---|---|---|---|
| Python | 3.13 | 3.15.2 (3.14.10, 3.13.18 still supported; 3.13 EOL 2029-10) | Two minors behind but supported | https://endoflife.date/python | 3.14 (`requires-python >=3.13`); 3.13 is acceptable |
| uv | 0.13.x | 0.13.6 (2026-10-27) | Current | https://pypi.org/project/uv/ | 0.13.x |
| FastAPI | 0.136.x | 0.162.0 (2026-10-23) | Stale (26 minors behind) | https://pypi.org/project/fastapi/ | 0.162.x |
| Pydantic | 2.x | 2.14.1 (2026-10-11) | Current | https://pypi.org/project/pydantic/ | 2.14.x (FastAPI requires >=2.9) |
| Uvicorn | 0.3x | 0.54.0 (2026-09-25) | Stale (0.3x is far behind) | https://pypi.org/project/uvicorn/ | 0.54.x |
| Pillow | 12.x | 13.0.0 (2026-10-16) | Stale (new major) | https://pypi.org/project/pillow/ , https://pillow.readthedocs.io/en/stable/releasenotes/13.0.0.html | 13.x |
| React | 19.x | 19.3.1 (2026-10-14) | Current | https://www.npmjs.com/package/react | 19.3.x |
| TypeScript | 5.x | 7.0.2 (2026-07-08); 6.0.3 is the last 6.x; 5.9.3 is the last 5.x | Stale (two majors behind) | https://www.npmjs.com/package/typescript | See fit concern 1. 5.9.x if openapi-typescript runs in the same project; otherwise ~7.0 as the Vite template ships |
| Vite (react-ts template) | 8.x | vite 8.3.5 (2026-10-21); create-vite 9.3.3 | Current | https://www.npmjs.com/package/vite , https://github.com/vitejs/vite/blob/main/packages/create-vite/template-react-ts/package.json | 8.3.x |
| openapi-typescript | 7.x | 7.13.0 (2026-02-11); no 8.x tag | Current, but the last release was 8 months ago | https://www.npmjs.com/package/openapi-typescript | 7.13.x |
| Playwright (`@playwright/test`) | 1.5x | 1.64.1 (2026-10-14); 1.65 alpha | Stale (1.6x line since 1.60, May 2026) | https://www.npmjs.com/package/@playwright/test | 1.64.x |
| pytest | 8.x | 9.2.0 (2026-10-27) | Stale (new major) | https://pypi.org/project/pytest/ | 9.x |
| TanStack Query (`@tanstack/react-query`) | expected default, no pin | 5.105.0 (2026-10-26) | n/a | https://www.npmjs.com/package/@tanstack/react-query | 5.x |

Other notes:
- The current `template-react-ts` uses `typescript ~7.0.2`, `@vitejs/plugin-react ^6.1.2` and `oxlint` (ESLint is no longer the default). Its build script is `tsc -b && vite build`.
- `openapi-fetch` 0.17.0 is the companion typed client if one is wanted. It is not in the spine.

## Fit concerns

1. **openapi-typescript and TypeScript 7 (high).** openapi-typescript 7.13.0 declares `peerDependencies: { typescript: "^5.x" }`. It generates code through the TypeScript compiler API (`ts.factory`), and TS 7 is the native Go port. A fresh `npm create vite -- --template react-ts` installs TS 7.0.2. Expect an npm peer-resolution error, and possibly a runtime failure of the generator. typescript-eslint shows the same problem with TS 7 (https://github.com/typescript-eslint/typescript-eslint/issues/12518). No statement on TS 7 support by openapi-typescript was found (UNVERIFIED). Options:
   - (a) Pin `typescript ~5.9` for the frontend package. This is the simplest option.
   - (b) Keep TS 7 for `tsc -b` and give the codegen step its own isolated TS 5.9 install, for example `npx -p typescript@5.9 -p openapi-typescript@7 openapi-typescript ...`.
   - (c) Spike TS 7 together with an npm `overrides` entry before committing to it.
   Either way, the spine's "TypeScript 5.x" pin conflicts with "Vite 8.x (react-ts template)". The spine should say which one wins.
2. **`uv tool install` and the built `frontend/dist` (medium).** The installer builds a wheel from the local repo, so `frontend/dist` must exist before install, and the build backend must include it.
   - `frontend/dist` is usually gitignored and sits outside the Python package directory.
   - Hatchling excludes gitignored files unless they are listed under `artifacts` or force-included.
   - Neither backend picks up files outside the module directory without explicit config.
   Recommendation: have the Vite build output into a package-data directory such as `src/bookvie/http/static/` and declare it explicitly in the build backend (hatchling `artifacts` or `force-include`; uv_build module/data config). Serve it with `importlib.resources`. Add a smoke test that installs the wheel and checks that `GET /` returns the SPA. Also, `uv tool install .` caches by version, so a reinstall after a frontend rebuild needs `--reinstall` (or `--force`). Exact uv_build include semantics with gitignore: UNVERIFIED, test this.
3. **FastAPI's OpenAPI 3.1 output and the major bumps (low).**
   - FastAPI emits OpenAPI 3.1.x, which openapi-typescript 7 supports (3.0 and 3.1). Pydantic v2 output for `Optional` uses `anyOf [..., {type: null}]` and becomes `T | null`.
   - With the camelCase alias generator, generate the schema with `by_alias` (FastAPI's default `response_model_by_alias=True`) so the TS field names match the wire. Freshness check: dump `app.openapi()` from Python with no running server, then diff the generated TS.
   - Pillow 13 drops Python 3.10. `thumbnail()` and `resize()` now apply `reducing_gap` to RGBA and LA images, so cover-downscale output for alpha images may change slightly. Re-baseline any golden-image tests.
   - pytest 9 is a major bump. No breakage is expected for plain pytest use, but the 9.0 changelog was not reviewed (UNVERIFIED).
   - Python 3.15: wheel availability for pydantic-core and Pillow on 3.15 was not checked (UNVERIFIED), hence the recommendation of 3.14 rather than 3.15.
