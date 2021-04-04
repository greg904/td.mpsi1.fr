#!/bin/bash

pids=()

kill_bg() {
	for p in ${pids[@]}; do
		echo Killing $p...
                kill -TERM $p
        done
}

trap kill_bg EXIT

( cd api && HTTP_PORT=3000 APP_PASSWD=test DB_PATH=db.sqlite3 APP_SECRET=aaaa CORRECTIONS_PATH=corrections cargo run ) &
pids+=($!)

( cd front && npm run start ) &
pids+=($!)

cd api && mkdir -p corrections && cd corrections && python -m http.server
