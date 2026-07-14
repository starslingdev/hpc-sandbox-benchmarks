// "Bake" for namespace: there is no separate artifact — namespace pulls the toolchain image
// directly via its Compute API's `containers[].image_ref` at create time (an arbitrary OCI ref,
// no template/snapshot system). The candidate image just needs to be pushed (buildAndPushCandidate
// / `--build-push`); reachability with credentials is proven by the validate boot that follows.
import type { Log } from "./types.ts";

export function bakeNamespaceImage(log: Log): Promise<void> {
	log(
		"namespace pulls the candidate image straight into a container instance — no artifact to " +
			"bake; the candidate image must be pushed and reachability is the validate boot",
	);
	return Promise.resolve();
}
