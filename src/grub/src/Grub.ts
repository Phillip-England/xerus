import { Cmd } from "./Cmd";
import { getArgByPos } from "./util";

export class Grub {
  defaultCmd: Cmd;
  thirdArg: string;
  cmds: Cmd[];
  constructor(...cmds: Cmd[]) {
    this.cmds = cmds;
    this.defaultCmd = this.locateDefaultCmd()
    this.thirdArg = this.loadThirdArg()
    this.errOnDuplicateNames();
  }
  locateDefaultCmd(): Cmd {
    let defaultCmds: Cmd[] = [];
    for (let i = 0; i < this.cmds.length; i++) {
      let cmd = this.cmds[i] as Cmd;
      if (cmd.isDefault) {
        defaultCmds.push(cmd);
      }
    }
    if (defaultCmds.length == 0) {
      throw new Error(`GRUB ERR: no default cmd located`)
    }
    if (defaultCmds.length > 1) {
      throw new Error(`GRUB ERR: multiple default cmds located`)
    }
    return defaultCmds[0] as Cmd;
  }
  loadThirdArg(): string {
    let thirdArg = getArgByPos(2);
    if (thirdArg == '') {
      return 'default';
    }
    return thirdArg;
  }
  async run() {
    let cmd = this.locateCmdToRun()
    await cmd.operation();
  }
  locateCmdToRun(): Cmd {
    if (this.thirdArg == 'default') {
      return this.defaultCmd;
    } else {
      for (let i = 0; i < this.cmds.length; i++) {
        let cmd = this.cmds[i] as Cmd;
        if (this.thirdArg == cmd.name) {
          return cmd;
        }
      }
    }
    throw new Error(`no cmd named ${this.thirdArg} located`);
  }
  errOnDuplicateNames() {
    let foundNames: string[] = [];
    for (let i = 0; i < this.cmds.length; i++) {
      let cmd = this.cmds[i] as Cmd;
      if (foundNames.includes(cmd.name)) {
        throw new Error(`you have two cmds named ${cmd.name}`)
      }
      foundNames.push(cmd.name);
    }
  }
}