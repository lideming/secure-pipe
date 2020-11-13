#!/bin/sh

exec deno run --unstable --import-map=import_map.json --allow-net main.ts
