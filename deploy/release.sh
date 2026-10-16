#!/bin/sh
set -eu
release="${1:?Release identifier required}"
case "$release" in *[!0-9A-Za-z_-]*|'') exit 2;; esac
root=/qyvia/realmed
target="$root/releases/$release"
test ! -e "$target"
mkdir "$target"
tar -xzf "$root/shared/$release.tar.gz" -C "$target"
ln -s "$root/shared/backend.env" "$target/backend/.env"
ln -s "$root/shared/storage" "$target/storage"
chmod -R a+rX "$target/frontend/dist"
cd "$target/backend"
npm ci --omit=dev --no-audit --no-fund
npm test
node ../deploy/migrate.cjs
cp "$root/shared/backend.env" "$root/shared/backend.env.before-$release"
node ../deploy/enable-permissions.cjs
previous=$(readlink -f "$root/current")
switch_to() {
    ln -s "$1" "$root/current.next"
    mv -Tf "$root/current.next" "$root/current"
    pm2 startOrRestart "$root/current/deploy/ecosystem.config.cjs" --only realmed-api --update-env
}
switch_to "$target"
healthy=false
for attempt in 1 2 3 4 5; do
    if curl -fsS http://10.100.67.92:3013/api/health >/dev/null; then healthy=true; break; fi
    sleep 2
done
if [ "$healthy" != true ]; then
    cp "$root/shared/backend.env.before-$release" "$root/shared/backend.env"
    switch_to "$previous"
    echo 'Health check failed; previous application version restored. Database migrations were not rolled back.' >&2
    exit 1
fi
pm2 save >/dev/null
printf '%s\n' "$previous" > "$root/shared/previous-release"
echo "Published Realmed release $release"
