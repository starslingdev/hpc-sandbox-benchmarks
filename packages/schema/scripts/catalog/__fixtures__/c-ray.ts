// The c-ray-2.0.0 upstream profile, inlined as a test fixture. c-ray is retired from the vendored set
// (the cpu-generic suite is gone), but it remains the cleanest small multi-result option matrix for the
// generator's unit tests — two <Option> axes, one <Description> per resolution, a numeric result
// transform — so its XML is kept here rather than in `src/pts-profiles/`. Decoupling these tests from the
// vendored set is also correct: the generator's parse/synthesize/generate logic is what they exercise,
// not which profiles happen to ship. Byte-copied from the upstream test-profiles vendoring.
import type { PtsProfile } from "../parse.ts";
import { parseProfile } from "../parse.ts";

export const CRAY_TEST_DEFINITION = `<?xml version="1.0"?>
<!--Phoronix Test Suite v10.8.5-->
<PhoronixTestSuite>
  <TestInformation>
    <Title>C-Ray</Title>
    <AppVersion>2.0</AppVersion>
    <Description>This is a test of C-Ray, a simple multi-threaded raytracer designed to test the floating-point CPU performance.</Description>
    <ResultScale>Seconds</ResultScale>
    <Proportion>LIB</Proportion>
    <SubTitle>Total Time - 4K, 16 Rays Per Pixel</SubTitle>
    <TimesToRun>2</TimesToRun>
  </TestInformation>
  <TestProfile>
    <Version>2.0.0</Version>
    <SupportedPlatforms>Linux, Solaris, MacOSX, BSD</SupportedPlatforms>
    <SoftwareType>Utility</SoftwareType>
    <TestType>Processor</TestType>
    <License>Free</License>
    <Status>Verified</Status>
    <ExternalDependencies>build-utilities</ExternalDependencies>
    <EnvironmentSize>6.0</EnvironmentSize>
    <ProjectURL>http://nuclear.mutantstargoat.com/sw/c-ray/</ProjectURL>
    <RepositoryURL>https://github.com/jtsiomb/c-ray</RepositoryURL>
    <InternalTags>SMP</InternalTags>
    <Maintainer>Michael Larabel</Maintainer>
  </TestProfile>
  <TestSettings>
    <Option>
      <DisplayName>Resolution</DisplayName>
      <Identifier>resolution</Identifier>
      <ArgumentPrefix>-s </ArgumentPrefix>
      <Menu>
        <Entry>
          <Name>1080p</Name>
          <Value>1920x1080</Value>
        </Entry>
        <Entry>
          <Name>4K</Name>
          <Value>3840x2160</Value>
        </Entry>
        <Entry>
          <Name>5K</Name>
          <Value>5120x2880</Value>
          <Message>Practical for high core count systems.</Message>
        </Entry>
      </Menu>
    </Option>
    <Option>
      <DisplayName>Rays Per Pixel</DisplayName>
      <Identifier>rays</Identifier>
      <ArgumentPrefix>-r </ArgumentPrefix>
      <Menu>
        <Entry>
          <Name>16</Name>
          <Value>16</Value>
        </Entry>
      </Menu>
    </Option>
  </TestSettings>
</PhoronixTestSuite>
`;

export const CRAY_RESULTS_DEFINITION = `<?xml version="1.0"?>
<!--Phoronix Test Suite v10.8.5-->
<PhoronixTestSuite>
  <ResultsParser>
    <OutputTemplate>Rendering took: 86 seconds (#_RESULT_# milliseconds)</OutputTemplate>
    <DivideResultBy>1000</DivideResultBy>
  </ResultsParser>
</PhoronixTestSuite>
`;

/** The parsed c-ray profile the generator tests exercise (repo `pts`, dir `c-ray-2.0.0`). */
export function crayProfile(): PtsProfile {
	return parseProfile("pts", "c-ray-2.0.0", CRAY_TEST_DEFINITION, CRAY_RESULTS_DEFINITION);
}
