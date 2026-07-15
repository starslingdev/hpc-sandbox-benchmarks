#!/bin/sh
set -eu

# The upstream profile's generated dd|nc runner can race its listener and hung indefinitely on every
# provider in matrix run 29346212440. Generate a deterministic netcat-openbsd runner: wait until the
# listener is visible in /proc/net/tcp, stream exactly 10 GiB through loopback, then reap it.
cat <<'EOF' > network-loopback
#!/bin/sh
set -eu

port=12345
listener=""
cleanup() {
  if [ -n "$listener" ]; then
    kill "$listener" 2>/dev/null || true
    wait "$listener" 2>/dev/null || true
  fi
}
trap cleanup EXIT HUP INT TERM

nc -l 127.0.0.1 "$port" >/dev/null &
listener=$!
port_hex=$(printf '%04X' "$port")
attempt=0
while ! awk -v port=":${port_hex}" '$2 ~ (port "$") && $4 == "0A" { found=1 } END { exit !found }' /proc/net/tcp; do
  if ! kill -0 "$listener" 2>/dev/null; then
    echo "loopback listener exited before accepting a connection" >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 1000 ]; then
    echo "loopback listener did not become ready" >&2
    exit 1
  fi
  # Avoid a CPU-starving busy loop and give a loaded sandbox up to ten seconds to bind.
  sleep 0.01
done

dd if=/dev/zero bs=16M count=640 status=none | nc -N 127.0.0.1 "$port"
wait "$listener"
listener=""
EOF
chmod +x network-loopback

echo 0 > ~/install-exit-status
