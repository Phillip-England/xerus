import { tmpdir } from "os"
import { FileRouter } from "../../src/filerouter/FileRouter"
import { embedMacro } from "../../src/filerouter/embedMacro" with { type: "macro" }
import path from 'path'

try {
  let embeddedDir = await embedMacro('/home/jacex/src/xerus/tests/filerouter/testapp')
  let router = await FileRouter.new({
    'src': path.join(process.cwd(), 'tests', 'filerouter', 'testapp'),
    'tmpDir': path.join(tmpdir(), "xerus"),
    'port': 8080,
    'embeddedDir': embeddedDir
  })
await router.listen()
} catch (err: any) {
  console.error(err.message)
}