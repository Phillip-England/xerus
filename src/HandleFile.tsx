import { Dirent } from 'fs';

export class HandleFile {
    file: Dirent
    endpointPath: string
    relativePath: string
    absolutePath: string

    constructor(file: Dirent) {
        this.file = file
        this.endpointPath = ''
        this.relativePath = ''
        this.absolutePath = ''
        let path = file.parentPath.replace('app', '')
        if (path === '') {
            path = '/'
            this.endpointPath = path
            this.relativePath = path + file.name
        } else {
            this.endpointPath = path
            this.relativePath = path + '/' + file.name
        }
        this.absolutePath = "./app" + this.relativePath
        console.log(this.relativePath, this.absolutePath, this.endpointPath)
    }
}