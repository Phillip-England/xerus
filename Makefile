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

run-server:
	bun run --hot ./tests/server/server.ts

test-server:
	bun test ./tests/server/server.test.ts

bench-server:
	bun test ./tests/server/bench.test.ts

run-filerouter:
	bun run --hot ./tests/filerouter/filerouter.ts

test-filerouter:
	bun test ./tests/filerouter/filerouter.test.ts
