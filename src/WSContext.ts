export class WSContext {
  req: Request;
  path: string;
  data: Record<string, any>;

  constructor(req: Request, path: string) {
    this.req = req;
    this.path = path;
    this.data = {};
  }

  get(key: string) {
    return this.data[key];
  }

  set(key: string, value: any) {
    this.data[key] = value;
  }
}
