# vars
TAILWIND_INPUT = ./static/css/input.css
TAILWIND_OUTPUT = ./static/css/output.css

# running "make" will run this command
all: build

# The build target runs the TailwindCSS command
tw:
	tailwindcss -i $(TAILWIND_INPUT) -o $(TAILWIND_OUTPUT) --watch

# kills all activity on port 8080
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