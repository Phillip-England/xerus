import React from "react"
import { renderToString } from "react-dom/server"

export const IconToggle = () => {
    let [isToggled, setIsToggled] = React.useState(false)
    return (
        <div id='icon-toggle' use-client='true'>
            {isToggled ? <h1>🍔</h1> : <h1>🍕</h1>}
            <button onClick={() => setIsToggled(!isToggled)}>Toggle</button>
        </div>
    )

}

export const Layout = (jsx: JSX.Element) => {
    let strElement = renderToString(jsx)
    return `
        <html>
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Document</title>
            </head>
            <body>
                <div id="root">${strElement}</div>
                <script src="/static/index.js"></script>
            </body>
        </html>
    `
}