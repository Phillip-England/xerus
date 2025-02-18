import { HTTPContext, Xerus } from "../xerus";

let app = new Xerus()

app.get('/set', async (c: HTTPContext) => {
  c.setCookie('secret', "O'Doyle_Rules!")
  return c.redirect('/get')
});

app.get('/get', async (c: HTTPContext) => {
  let cookie = c.getCookie('secret')
  if (cookie) {
    return c.text(`visit /clear to clear the cookie with the value: ${cookie}`)
  }
  return c.text('visit /set to set the cookie')
})

app.get('/clear', async (c: HTTPContext) => {
  c.clearCookie('secret')
  return c.redirect('/get')
})

await app.listen()