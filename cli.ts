#!/usr/bin/env bun

import { Grub } from './src/grub/entrypoint';
import { help } from './src/cmd/help'
import { init } from './src/cmd/init'

let cli = new Grub(help, init)
try {
  await cli.run();
} catch (err: any) {
  console.error(err.message);
}