
export class WSContext { 
  headers?: HeadersInit
  data: Record<string, any>
  constructor(req: Request, path: string) {
    this.data = {
      req,
      path,
    }
  }
  get(key: string) {
    return this.data[key]
  }
  set(key: string, value: any) {
    this.data[key] = value
  }
}