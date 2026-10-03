import { defineModalDriver } from "./driver.ts";

export default defineModalDriver("modal-gvisor");

export {
	createModalAllocation,
	type ModalAllocationConfiguration,
	type ModalAllocationOptions,
} from "./allocation.ts";
