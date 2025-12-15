import { Cmd } from "./Cmd";
import { getArgByPos } from "./util";

export class Grub {
  // We now store paths initially, and Cmd objects later
  cmdPaths: string[]; 
  cmds: Cmd[];
  
  defaultCmd: Cmd | null;
  thirdArg: string;

  constructor(...cmdPaths: string[]) {
    this.cmdPaths = cmdPaths;
    this.cmds = [];
    this.defaultCmd = null;
    this.thirdArg = this.loadThirdArg();
  }

  // --- INTERNAL LOADING LOGIC ---
  private async bootstrap() {
    // 1. Dynamically import all command paths
    for (const pth of this.cmdPaths) {
      try {
        // Bun knows how to load the file from the embedded path
        const module = await import(pth);
        
        // We assume the file has "export default new Cmd(...)"
        const cmdInstance = module.default;

        if (cmdInstance instanceof Cmd) {
            this.cmds.push(cmdInstance);
        } else {
            console.warn(`Warning: File at ${pth} did not export a Cmd class as default.`);
        }
      } catch (e) {
        throw new Error(`Failed to load command from ${pth}: ${e}`);
      }
    }

    // 2. Now that cmds are loaded, run the checks
    this.errOnDuplicateNames();
    this.defaultCmd = this.locateDefaultCmd();
  }

  // --- RUN LOGIC ---
  async run() {
    // Lazy load the commands when run() is called
    await this.bootstrap(); 

    const cmd = this.locateCmdToRun();
    await cmd.operation();
  }

  // --- HELPER METHODS (Unchanged logic, just cleanup) ---
  
  locateDefaultCmd(): Cmd {
    const defaultCmds = this.cmds.filter(c => c.isDefault);
    
    if (defaultCmds.length === 0) {
      throw new Error(`GRUB ERR: no default cmd located`);
    }
    if (defaultCmds.length > 1) {
      throw new Error(`GRUB ERR: multiple default cmds located`);
    }
    return defaultCmds[0];
  }

  loadThirdArg(): string {
    const thirdArg = getArgByPos(2);
    return thirdArg === '' ? 'default' : thirdArg;
  }

  locateCmdToRun(): Cmd {
    if (this.thirdArg === 'default') {
      // We know this isn't null because bootstrap calls locateDefaultCmd which throws if missing
      return this.defaultCmd!; 
    } else {
      const found = this.cmds.find(c => c.name === this.thirdArg);
      if (found) return found;
    }
    throw new Error(`no cmd named ${this.thirdArg} located`);
  }

  errOnDuplicateNames() {
    const names = new Set<string>();
    for (const cmd of this.cmds) {
      if (names.has(cmd.name)) {
        throw new Error(`you have two cmds named ${cmd.name}`);
      }
      names.add(cmd.name);
    }
  }
}