import { Xerus } from "../../src/Xerus";
import { basicGet } from "./0_basicGet";

export const BaseURL = "https://localhost:8080"

const app = new Xerus()
basicGet(app)
