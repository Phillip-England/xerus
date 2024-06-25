import { Dirent } from 'fs';
import * as path from 'path';

export class File {
    file: Dirent
    endpointPath: string
    relativePath: string
    absolutePath: string

    constructor(file: Dirent) {
        this.file = file
        this.endpointPath = ''
        this.relativePath = ''
        this.absolutePath = ''
        let pathSegment = file.parentPath.replace('app', '')
        if (pathSegment === '') {
            pathSegment = '/'
            this.endpointPath = pathSegment
            this.relativePath = pathSegment + file.name
        } else {
            this.endpointPath = pathSegment
            this.relativePath = pathSegment + '/' + file.name
        }
        this.absolutePath = path.resolve("./app" + this.relativePath)
    }
}
