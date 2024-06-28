// client/index.ts
class Signal {
  value;
  listeners;
  constructor(initialValue) {
    this.value = initialValue;
    this.listeners = new Set;
  }
  get() {
    return this.value;
  }
  set(newValue) {
    if (newValue !== this.value) {
      this.value = newValue;
      this.notify();
    }
  }
  subscribe(listener) {
    this.listeners.add(listener);
  }
  unsubscribe(listener) {
    this.listeners.delete(listener);
  }
  notify() {
    for (const listener of this.listeners) {
      listener(this.value);
    }
  }
}

class Store {
  static instance;
  signals;
  constructor() {
    this.signals = new Map;
  }
  getSignal(key, initialValue) {
    if (!this.signals.has(key)) {
      this.signals.set(key, new Signal(initialValue));
    }
    return this.signals.get(key);
  }
  setSignal(key, value) {
    if (this.signals.has(key)) {
      const signal = this.signals.get(key);
      signal.set(value);
    }
  }
  static getInstance() {
    if (!Store.instance) {
      Store.instance = new Store;
    }
    return Store.instance;
  }
}
var store = Store.getInstance();
