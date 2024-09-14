

let xerus = Bun.file('./src/Xerus.jsx')
let xerusContext = Bun.file('./src/XerusContext.jsx')
let xerusMiddleware = Bun.file('./src/XerusMiddleware.js')
let xerusResponse = Bun.file('./src/XerusResponse.js')

let output = ''

output += await xerus.text()
output += await xerusContext.text()
output += await xerusMiddleware.text()
output += await xerusResponse.text()

let outputLines = output.split('\n')

let filteredOutput = outputLines.filter((value, index) => {
    if (value.includes('import')) {
        return false
    }
    return true
})

await Bun.write('./index.js', filteredOutput.join('\n'))

