kill:
	sudo lsof -t -i:8080 | xargs kill -9

test:
	clear; bun test ./tests

bench-raw:
	wrk -t12 -c400 -d30s http://localhost:8080/

bench-routing:
	wrk -t12 -c400 -d30s http://localhost:8080/users/12345

bench-embedded:
	wrk -t12 -c400 -d10s http://localhost:8080/static-site/index.html

bench-static:
	wrk -t12 -c400 -d10s http://localhost:8080/disk-src/Xerus.ts

bench-json:
	@echo 'wrk.method = "POST"; wrk.body = "{\"name\": \"Benchmark Item\"}"; wrk.headers["Content-Type"] = "application/json"' > temp_post.lua
	wrk -t12 -c400 -d30s -s temp_post.lua http://localhost:8080/items
	@rm temp_post.lua

dev:
	bun run --hot ./www/index.ts