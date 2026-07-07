#!/bin/sh
set -eu
# PTS local-profile install script: generates the `hardlink` executable PTS invokes at batch-run
# time (the runtime convention — an executable named after the versionless profile dir, in the
# install cwd). Uses the system stress-ng (apt install stress-ng); no source build. Ported from
# runner-benchmarking, the last place this profile actually ran: sandbox-benchmarks vendored only
# test-definition.xml/results-definition.xml, so PTS reported "No installation script found" and
# never produced a real measurement.
if ! command -v stress-ng >/dev/null 2>&1; then
  echo "ERROR: stress-ng not installed (apt install stress-ng)" >&2
  echo 1 > ~/install-exit-status
  exit 1
fi

cat <<'EOF' > hardlink
#!/bin/sh
stress-ng "$@" > "$LOG_FILE" 2>&1
echo $? > ~/test-exit-status
EOF
chmod +x hardlink

echo 0 > ~/install-exit-status
