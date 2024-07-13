import React from "react"
import { renderToString } from "react-dom/server"


export const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html>
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Document</title>
            </head>
            <body>
                {children}
                <script src="/static/index.js"></script>
            </body>
        </html>
    );
};