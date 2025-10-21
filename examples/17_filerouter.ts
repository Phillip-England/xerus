import { FileRouter } from "../filerouter";
import path from 'path'


let router = await FileRouter.new({
  'src': path.join(process.cwd(), 'app'),
  'port': 8080,
})
await router.listen()