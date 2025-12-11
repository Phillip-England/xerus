export class Cmd {
  name: string;
  isDefault: boolean;
  operation: () => Promise<void>;
  constructor(name: string) {
    this.name = name;
    this.isDefault = false;
    this.operation = async () => {
      throw new Error(`operation not set on cmd named: ${this.name}`);
    }
  }
  setAsDefault() {
    this.isDefault = true;
  }
  setOperation(op: () => Promise<void>) {
    this.operation = op;
  }
}
