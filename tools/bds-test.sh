#!/usr/bin/env bash
# Smoke test: load the packs into a Bedrock Dedicated Server (Docker), run the
# in-game self test (lasers, sensors, bridge, bomb, doors, blueprints) and fail
# if it reports failures or the content log reports errors.
# Usage: tools/bds-test.sh   (run `npm run build` first)
set -euo pipefail

cd "$(dirname "$0")/.."
NAME=secgear-bds-test
DATA="$PWD/build/bds"
LEVEL=secgear_test
IMAGE=${BDS_IMAGE:-itzg/minecraft-bedrock-server:latest}
TIMEOUT=${BDS_TIMEOUT:-600}

uuid() { node -e "console.log(require('./build/$1/manifest.json').header.uuid)"; }
version() { node -e "console.log(JSON.stringify(require('./build/$1/manifest.json').header.version))"; }

docker rm -f "$NAME" >/dev/null 2>&1 || true
rm -rf "$DATA"
mkdir -p "$DATA/behavior_packs" "$DATA/resource_packs" "$DATA/worlds/$LEVEL"
cp -R build/behavior_pack "$DATA/behavior_packs/secgear_bp"
cp -R build/resource_pack "$DATA/resource_packs/secgear_rp"
echo "[{\"pack_id\":\"$(uuid behavior_pack)\",\"version\":$(version behavior_pack)}]" > "$DATA/worlds/$LEVEL/world_behavior_packs.json"
echo "[{\"pack_id\":\"$(uuid resource_pack)\",\"version\":$(version resource_pack)}]" > "$DATA/worlds/$LEVEL/world_resource_packs.json"

docker run -d --name "$NAME" --cap-add SYS_PTRACE \
  -e EULA=TRUE \
  -e LEVEL_NAME="$LEVEL" \
  -e LEVEL_TYPE=FLAT \
  -e GAMEMODE=creative \
  -e CONTENT_LOG_FILE_ENABLED=true \
  -e CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true \
  -e CONTENT_LOG_LEVEL=info \
  -v "$DATA:/data" \
  "$IMAGE" >/dev/null

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Waiting for server (timeout ${TIMEOUT}s)..."
start=$(date +%s)
until docker logs "$NAME" 2>&1 | grep -q "Server started"; do
  if ! docker ps -q -f name="$NAME" | grep -q .; then
    docker logs "$NAME" 2>&1 | tail -50
    echo "Server container exited early"; exit 1
  fi
  if (( $(date +%s) - start > TIMEOUT )); then
    docker logs "$NAME" 2>&1 | tail -50
    echo "Timed out waiting for server"; exit 1
  fi
  sleep 5
done

send() { docker exec -u 0 "$NAME" send-command "$@"; }
send tickingarea add circle 16 0 24 4 secgear_test true
sleep 5
send summon secgear:security_guard 30 -60 2
send summon secgear:guard_dog 32 -60 2
send summon secgear:security_camera 34 -60 2
send scriptevent secgear:selftest run
for _ in $(seq 1 40); do
  docker logs "$NAME" 2>&1 | grep -q "SELFTEST DONE" && break
  sleep 3
done

LOG=$(docker logs "$NAME" 2>&1)
echo "$LOG" | grep -iE "secgear|SELFTEST|error|warn|\[Scripting\]" | grep -vE "send-command|^\s*$" | tail -120 || true

if ! echo "$LOG" | grep -q "SELFTEST DONE"; then
  echo "FAIL: the self test did not finish"; exit 1
fi
if echo "$LOG" | grep -q "SELFTEST FAIL"; then
  echo "FAIL: self test failures (see above)"; exit 1
fi
if echo "$LOG" | grep -E "ERROR|\[error\]|Error\]" | grep -viE "Failed to connect|network|telemetry" | grep -q .; then
  echo "FAIL: content log has errors"; exit 1
fi
echo "PASS: Bedrock Dedicated Server loaded the packs and the self test passed"
