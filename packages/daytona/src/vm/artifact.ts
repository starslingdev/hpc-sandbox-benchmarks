// daytona-vm's artifact builder: a LINUX_VM-class snapshot in the region DAYTONA_TARGET names.
import { SandboxClass } from "@daytona/sdk";
import { daytonaArtifactBuilder } from "../snapshot-build.ts";

export default daytonaArtifactBuilder("daytona-vm", {
	sandboxClass: SandboxClass.LINUX_VM,
	target: (env) => env.DAYTONA_TARGET,
});
