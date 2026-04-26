# web_ui

## Mirror to rjgeng/web_ui

Every push to `main` on `shuhan-study/web_ui` is mirrored to `rjgeng/web_ui:main`
by `.github/workflows/mirror.yml`. Vercel deploys from `rjgeng`, so the mirror
must succeed for changes to ship.

The workflow authenticates via an ssh deploy key:

- Secret name: `RJGENG_DEPLOY_KEY` (on `shuhan-study/web_ui`)
- Corresponding public key: installed as a **write-access** deploy key on
  `rjgeng/web_ui`

### Rotating the key

1. Generate a new ed25519 keypair (no passphrase):
   `ssh-keygen -t ed25519 -C "rjgeng-mirror" -f rjgeng_mirror -N ""`
2. On `rjgeng/web_ui` → Settings → Deploy keys: remove the old key, add
   `rjgeng_mirror.pub` with **Allow write access** checked.
3. On `shuhan-study/web_ui` → Settings → Secrets → Actions: update
   `RJGENG_DEPLOY_KEY` with the contents of `rjgeng_mirror` (the private key).
4. Push any commit to `main` and confirm the `Mirror to rjgeng/web_ui` workflow
   run is green and `rjgeng/web_ui:main` advances to the new HEAD.
