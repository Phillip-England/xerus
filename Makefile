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

aic-document:
	aic prompt "@src okay that is our library, we are trying to make sure it is properly doucments. Here is how we will do this. First, any code you provide to me must be in the form of full files no snippets please, okay please examine these examples @examples if any of the examples are out of date or if we need new examples to properly showcase this library, please create them. Then, examine our tests, these tests should test the framework in such a way that causes it to behave as expected and ensure it functions without any bugs or edge cases if new test need to be added or any are out of date let me know @servers okay finally, I need this  README.html @README.html updated in such a way that I can then run pandoc over it to generate a README.md so your final job is to generate the HTML which will be used to document our library, and be sure to include all the examples in the html to people get a good view of the library"