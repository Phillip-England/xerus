kill:
	sudo lsof -t -i:8080 | xargs kill -9

run-http:
	bun run --hot ./servers/http/server.ts

test-http:
	bun test ./servers/http

run-ws:
	bun run --hot ./servers/websocket/server.ts

test-ws:
	bun test ./servers/websocket

bench-http-raw:
	wrk -t12 -c400 -d30s http://localhost:8080/

bench-http-routing:
	wrk -t12 -c400 -d30s http://localhost:8080/users/12345

bench-http-embedded-assets:
	wrk -t12 -c400 -d10s http://localhost:8080/static-site/index.html

bench-http-static-assets:
	wrk -t12 -c400 -d10s http://localhost:8080/disk-src/Xerus.ts

bench-http-json:
	@echo 'wrk.method = "POST"; wrk.body = "{\"name\": \"Benchmark Item\"}"; wrk.headers["Content-Type"] = "application/json"' > temp_post.lua
	wrk -t12 -c400 -d30s -s temp_post.lua http://localhost:8080/items
	@rm temp_post.lua

readme:
	pandoc README.html -f html -t gfm -o README.md

aic-examples:
	aic prompt "please look at my library, make sure my examples are up to date, and then suggest new examples to help example my lib better @src @examples"

aic-doc:
	aic prompt "okay your goal is to look at all the examples I am going to provide you, and document them in plain html which is converatable using pandoc, remember, you just generate the html which I will then pipe into pandoc, this html should clearly document my library using these examples @examples"

soak:
	aic prompt "this is my webframework code @src these are my tests @servers these are my examples @examples and these are my skills @skills"
