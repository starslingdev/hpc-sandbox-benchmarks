// "Bake" for modal: there is no separate artifact — modal boots the image directly via
// Image.fromRegistry at create time. The candidate image just needs to be pushed (buildAndPushCandidate
// / `--build-push`); reachability with credentials is proven by the validate boot that follows.
import type { Log } from "./types.ts";

export function bakeModalImage(image: string, log: Log): Promise<void> {
	log(
		`modal boots ${image} via fromRegistry — no artifact to bake; ` +
			`the candidate image must be pushed and reachability is the validate boot`,
	);
	return Promise.resolve();
}
