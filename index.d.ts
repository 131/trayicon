import { EventEmitter } from 'events';

export interface TrayOptions {
  title?: string;
  icon?: Buffer;
  debug?: boolean;
  action?: Function;
  useTempDir?: boolean | "clean";
}

export interface ItemOptions {
  action?: Function;
  label?: string;
  disabled?: boolean;
  checked?: boolean;
  bold?: boolean;
  type?: string;
}

export interface NotifyOptions {
  title?: string;
  msg?: string;
  timeout?: number;
  style?: 'info' | 'warn' | 'error';
}

export class Tray extends EventEmitter {
  constructor(opts?: TrayOptions);
  static create(opts?: TrayOptions, ready?: Function): Promise<Tray>;
  setTitle(title: string): void;
  setIcon(icon: Buffer): void;
  setAction(action: Function): void;
  notify(title: string, msg: string, action?: Function): void;
  setMenu(...items: Item[]): void;
  asXML(): string;
  kill(): void;
  separator(): Item;
  item(label: string, props?: ItemOptions): Item;
}

export class Item {
  constructor(label: string, props?: ItemOptions);
  add(...items: Item[]): void;
  asXML(): string;
}

export function create(opts?: TrayOptions, ready?: Function): Promise<Tray>;

export default { create: Tray.create }