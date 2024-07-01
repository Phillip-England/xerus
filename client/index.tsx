import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { IconToggle } from '../lib/components/components';

const qs = (selector: string) => document.querySelector(selector)
const qsa = (selector: string) => document.querySelectorAll(selector)


class Signal<T> {
    private value: T;
    private listeners: Set<(newValue: T) => void>;
  
    constructor(initialValue: T) {
        this.value = initialValue;
        this.listeners = new Set();
    }
  
    get(): T {
        return this.value;
    }
  
    set(newValue: T): void {
        if (newValue !== this.value) {
            this.value = newValue;
            this.notify();
        }
    }
  
    subscribe(listener: (newValue: T) => void): void {
        this.listeners.add(listener);
    }
  
    unsubscribe(listener: (newValue: T) => void): void {
        this.listeners.delete(listener);
    }
  
    private notify(): void {
        for (const listener of this.listeners) {
            listener(this.value);
        }
    }
}
  
class Store {
    private static instance: Store;
    public signals: Map<string, Signal<any>>;
  
    private constructor() {
        this.signals = new Map();
    }
  
    public getSignal<T>(key: string, initialValue: T): Signal<T> {
        if (!this.signals.has(key)) {
            this.signals.set(key, new Signal(initialValue));
        }
        return this.signals.get(key) as Signal<T>;
    }

    public setSignal<T>(key: string, value: T): void {
        if (this.signals.has(key)) {
            const signal = this.signals.get(key) as Signal<T>;
            signal.set(value);
        }
    }

    public static getInstance(): Store {
          if (!Store.instance) {
            Store.instance = new Store();
        }
        return Store.instance;
    }
}
  
const store = Store.getInstance();





hydrateRoot(document.getElementById('root') as Element, <IconToggle />);