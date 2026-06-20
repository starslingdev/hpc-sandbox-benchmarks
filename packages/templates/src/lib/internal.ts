// Private implementation detail of @sandbox-benchmarks/templates.
import { config } from "@sandbox-benchmarks/providers";
import type { ProviderDescriptor } from "@sandbox-benchmarks/schema";

/** A built sandbox template descriptor, carrying the build context for the provider's image. */
export interface TemplateSpec {
	/** The provider this template targets. */
	provider: ProviderDescriptor["id"];
	/** Opaque template tag/id/snapshot name the build/publish step produces or references. */
	tag: string;
	/** Repo-relative path to the variant Dockerfile that builds this provider's image. */
	dockerfile: string;
	/** The shared toolchain base image the variant composes on (its `ARG BASE_IMAGE`). */
	baseImage: string;
}

/** Where the in-repo toolchain Dockerfiles live (see images/README.md). */
const IMAGES_DIR = "packages/templates/images";

/** Shared helper used by every per-provider builder module. The Dockerfile path is derived from the
 *  provider and the base image is the shared toolchain ref, so the build context can't drift from the
 *  images/ layout. */
export function makeTemplateSpec(provider: ProviderDescriptor["id"], tag: string): TemplateSpec {
	return {
		provider,
		tag,
		dockerfile: `${IMAGES_DIR}/${provider}/Dockerfile`,
		baseImage: config.toolchainImage,
	};
}
