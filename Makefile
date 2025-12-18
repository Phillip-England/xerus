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