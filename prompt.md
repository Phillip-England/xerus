This framework already has a way to embed and make static assets available, but what about embedding other content like  templates or other information we might need to actually access in our routes?

What if we could do something like this:

```ts
let embedableDir = embedDir('/some/abs/path')
let app = new Xerus()
app.templates(embedableDir)
```

then in my route handlers I could access files like so:

```ts
import {template} from 'xerus'

async handle(c: HTTPContext) {
  let t = template(c, "/some/relative/path/from/the/templates/abs/path") // for example /some/abs/path/index.html about be accessible at template(c, './index.html') or template(c, 'index.html')
  // ^^ the above function should THROW if no template with the passes in name is available
}
```

This would allow me to pipe in any file into the system and use it later