// daytona-vm-arm's artifact builder: a LINUX_VM-class snapshot in the variant's v2 region.
import { SandboxClass } from "@daytona/sdk/v0";
import { DAYTONA_VM_REGIONS } from "@sandbox-benchmarks/schema/toolchain";
import { daytonaArtifactBuilder } from "../snapshot-build.ts";

export default daytonaArtifactBuilder("daytona-vm-arm", {
	sandboxClass: SandboxClass.LINUX_VM,
	target: () => DAYTONA_VM_REGIONS["daytona-vm-arm"],
});
