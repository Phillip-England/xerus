import { promises as fs } from 'fs';
import * as path from 'path';
import { Xerus } from './Xerus';

export class XerusTrace {
    constructor() {}

    static async log(text: any) {
        const dirPath = path.resolve('./logs');
        const filePath = path.resolve(dirPath, 'trace.txt');
        try {
            await fs.mkdir(dirPath, { recursive: true });
            await fs.appendFile(filePath, text + '\n', 'utf8');
        } catch (error) {
            console.error('Error writing to trace log:', error);
        }
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