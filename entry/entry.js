//@ts-ignore
import { api } from "../../scripts/api.js";

setTimeout(() => {
  import(api.api_base + "/copilot_web/input.js");
}, 500);
