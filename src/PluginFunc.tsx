import type { Xerus } from "./Xerus";



export type PluginFunc = (app: Xerus) => Promise<void>;