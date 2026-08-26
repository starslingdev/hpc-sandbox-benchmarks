// Private implementation detail of @sandbox-benchmarks/templates.
import { config } from "@sandbox-benchmarks/providers/config";

/**
 * The image variants under `images/`, which are NOT provider ids.
 *
 * One variant serves every provider that boots the same image: `modal` covers modal-gvisor and
 * modal-vm, `daytona` covers both daytona snapshots. Reusing `ProviderId` here would claim a
 * one-to-one mapping the images/ layout does not have — the loose `string` this replaced hid the
 * distinction rather than stating it.
 */
export type TemplateVariant = "base" | "e2b" | "daytona" | "modal";

/** A built sandbox template descriptor, carrying the build context for the provider's image. */
export interface TemplateSpec {
	/** The provider this template targets. */
	provider: TemplateVariant;
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
export function makeTemplateSpec(provider: TemplateVariant, tag: string): TemplateSpec {
	return {
		provider,
		tag,
		dockerfile: `${IMAGES_DIR}/${provider}/Dockerfile`,
		baseImage: config.toolchainImage,
	};
}
