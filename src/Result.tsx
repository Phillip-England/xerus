type Result<T, E> = Success<T, E> | Failure<T, E>;

class Success<T, E> {
  readonly type: 'success' = 'success';
  constructor(public readonly value: T) {}

  isSome(): this is Success<T, E> {
    return true;
  }

  unwrap(): T {
    return this.value;
  }
}

class Failure<T, E> {
  readonly type: 'failure' = 'failure';
  constructor(public readonly error: E) {}

  isSome(): this is Success<T, E> {
    return false;
  }

  unwrap(): T {
    throw new Error("Cannot unwrap a failure");
  }
}

export function $value<T, E>(value: T): Success<T, E> {
  return new Success(value);
}

export function $error<T, E>(error: E): Failure<T, E> {
  return new Failure(error);
}
