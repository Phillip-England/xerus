export class Result<T, E> {
    private constructor(private readonly value?: T, private readonly error?: E) {}
  
    static ok<T, E>(value: T): Result<T, E> {
      return new Result(value);
    }
  
    static err<T, E>(error: E): Result<T, E> {
      return new Result<T, E>(undefined, error);
    }
  
    isOk(): boolean {
      return this.error === undefined;
    }
  
    isErr(): boolean {
      return !this.isOk();
    }
  
    unwrap(): T {
      if (this.isErr()) {
        throw new Error("Cannot unwrap a failure: " + this.error);
      }
      return this.value!;
    }
  
    unwrapErr(): E {
      if (this.isOk()) {
        throw new Error("Cannot unwrap an Ok result");
      }
      return this.error!;
    }
  
    static async new<T, E>(operation: T | Promise<T>): Promise<Result<T, E>> {
      try {
        const value = operation instanceof Promise ? await operation : operation;
        return Result.ok<T, E>(value);
      } catch (error) {
        return Result.err<T, E>(error as E);
      }
    }
  }
  