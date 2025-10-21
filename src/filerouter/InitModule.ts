import { Xerus } from "../server/Xerus";

export class InitModule {
  initFunc: undefined | ((app: Xerus) => Promise<void>);
  endpoint: string = '/'
  constructor() {}
  async init(callback: (app: Xerus) => Promise<void>) {
    this.initFunc = callback;
  }
}
