import { FileRouter } from "../../src/filerouter/FileRouter"
import path from 'path';

try {
let router = await FileRouter.new({
  'src': path.join(process.cwd(), 'tests', 'filerouter', 'testapp'),
  'port': 8080,
})
await router.listen()
} catch (err: any) {
  console.error(err.message)
}