#!/usr/bin/env bun

import { cmdHelp } from "./src/cmd/help";
import { cmdInit } from "./src/cmd/init";


let args = Bun.argv;
let mainCmd = args[2]
switch (mainCmd) {
  case 'help': {
    await cmdHelp(args)
    break
  }
  case 'init': {
    await cmdInit(args)
    break
  }
  default: {
    await cmdHelp(args)
  }
}


// let cli = new Grub(helpPath as unknown as string, initPath as unknown as string, runPath as unknown as string);

// try {
//   await cli.run();
// } catch (err: any) {
//   console.error(err.message);
// }