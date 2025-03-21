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

run:
	bun run --hot ./tests/basic_endpoints/app.ts

combine:
	cat ./*.ts > combined.ts

test:
	bun test ./tests/basic_endpoints/app.test.ts

bench:
	bun test ./tests/bench.test.ts
