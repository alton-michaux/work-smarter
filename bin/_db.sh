# Shared helpers for bin/db-export and bin/db-import. Sourced, not run.
# Postgres tools run in the official image so the client always matches the server's
# major version, whatever is installed locally. URLs go in via env (PGURL), never argv,
# so passwords don't show up in `ps`.

CLIENT_MAJOR=18  # for version checks and counts; any recent psql talks to older servers

# pg <major> <cmd...>: run cmd in postgres:<major>-alpine with $WORK (default .) at /work
pg() {
  local major=$1; shift
  local work
  work=$(cd "${WORK:-.}" && pwd)
  docker run --rm -i --network host --user "$(id -u):$(id -g)" \
    -e PGURL -v "$work:/work" -w /work "postgres:${major}-alpine" "$@"
}

# server_major <url>: e.g. 16
server_major() {
  local num
  num=$(PGURL=$1 pg "$CLIENT_MAJOR" sh -c 'psql "$PGURL" -Atc "show server_version_num"')
  echo $((num / 10000))
}

# table_counts <url>: "<table> <rows>" per table in the public schema, sorted
table_counts() {
  PGURL=$1 pg "$CLIENT_MAJOR" sh -c 'psql "$PGURL" -At -F " " -v ON_ERROR_STOP=1' <<'SQL'
SELECT format('SELECT %L, count(*) FROM %I.%I', tablename, schemaname, tablename)
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename \gexec
SQL
}

# db_host <url>: host/dbname without credentials, for prompts and logs
db_host() {
  local rest=${1#*://}
  rest=${rest#*@}
  echo "${rest%%\?*}"
}
