import { WSContext, Xerus } from "../xerus";

let app = new Xerus()

app.ws("/chat", {
  async open(ws) {
    let c = ws.data // get the context
    
  },
  async message(ws, message) {

  },
  async close(ws, code, message) {

  },
  async onConnect(c: WSContext) {
    c.set('secret', "O'Doyle") // set pre-connect data
  }
});

await app.listen()