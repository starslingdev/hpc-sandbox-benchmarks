#!/usr/bin/env bash
# Blaxel's root overlay consumes shared memory. Seed the baked PTS tree onto the mounted XFS
# volume, and put HOME there, before starting the sandbox API or accepting benchmark commands.
set -Eeuo pipefail

volume=/mnt/benchmark-volume
pts=/var/lib/phoronix-test-suite
home=/blaxel

cd /
mountpoint -q "$volume" || { echo "Blaxel benchmark volume is not mounted at $volume" >&2; exit 1; }
mkdir -p "$volume/pts" "$volume/home"
if [[ ! -f "$volume/pts/.benchmark-seed-complete" ]]; then
	cp -a "$pts/." "$volume/pts/"
	touch "$volume/pts/.benchmark-seed-complete"
fi
rm -rf "$pts"
ln -s "$volume/pts" "$pts"
if [[ -d "$home" && ! -L "$home" ]]; then
	cp -a "$home/." "$volume/home/"
	rm -rf "$home"
fi
ln -sfn "$volume/home" "$home"
cd "$home"
exec /usr/local/bin/sandbox-api
