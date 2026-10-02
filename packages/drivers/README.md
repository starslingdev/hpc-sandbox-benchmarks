# @sandbox-benchmarks/drivers

Generated lazy fleet loader. `loadDriverModule(id)` preserves the selected provider's module and
native handle types while importing only that provider's package.

Implementations, SDK dependencies, tests, and provenance belong in `packages/<provider>`, such as
`@sandbox-benchmarks/blaxel`. Shared adapter mechanics belong in `@sandbox-benchmarks/driver`.
Daytona and Modal each share one package across their isolation variants.

To add a provider, create its source-first workspace package, declare the provider descriptor,
and run `bun run generate-providers`. The generator verifies that every registered provider's
package exports a default-exported driver module and that its `sdkPackage` is a dependency of that
package, then emits the fleet's workspace dependencies, lazy imports, and each package's provenance.
Isolation variants declare `package` in their descriptor; every other provider lives in
`packages/<id>`.
