import { promises as fs } from 'fs';
import * as path from 'path';

export class XerusTrace {
    constructor() {}

    async log(text: string) {
        const dirPath = path.resolve('./logs');
        const filePath = path.resolve(dirPath, 'trace.txt');
        try {
            await fs.mkdir(dirPath, { recursive: true });
            await fs.appendFile(filePath, text + '\n', 'utf8');
        } catch (error) {
            console.error('Error writing to trace log:', error);
        }
    }

    async funcTitle(text: string) {
        await this.log(`==============================================`)
        await this.log(`FUNC CALL: ${text}`)
        await this.newLine()
    }

    async funcEnd() {
        await this.log(`==============================================`)
    }

    async funcEndInto(funcName: string) {
        await this.log(`EXITING INTO: ${funcName}`)
        await this.log(`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
    }

    async funcBranchInto(funcName: string) {
        await this.log(`BRANCHING INTO: ${funcName}`)
        await this.log(`----------------------------------------------`)
    }

    async newLine() {
        await this.log('')
    }

    async err(err: string) {
        await this.log(`ERROR: ${err}`)
        throw new Error(err)
    }

    static async clear() {
        const dirPath = path.resolve('./logs');
        const filePath = path.resolve(dirPath, 'trace.txt');
        try {
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(filePath, '', 'utf8');
        } catch (error) {
            console.error('Error clearing trace log:', error);
        }
    }

}