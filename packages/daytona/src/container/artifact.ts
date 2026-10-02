// daytona-container's artifact builder: a CONTAINER-class snapshot in the region
// DAYTONA_CONTAINER_TARGET names.
import { SandboxClass } from "@daytona/sdk";
import { daytonaArtifactBuilder } from "../snapshot-build.ts";

export default daytonaArtifactBuilder("daytona-container", {
	sandboxClass: SandboxClass.CONTAINER,
	target: (env) => env.DAYTONA_CONTAINER_TARGET,
});
