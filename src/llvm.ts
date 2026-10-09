/* eslint-disable @typescript-eslint/naming-convention */

import semver from 'semver';
import fetch from 'node-fetch';

const versions: {[llvmRelease: string]: string[]} = {
  '23.1.0': ['Darwin-universal', 'Windows-x86_64', 'Linux-x86_64'],
  '22.1.0': ['Darwin-universal', 'Windows-x86_64', 'Linux-x86_64'],
  '21.1.1': ['Darwin-universal', 'Windows-x86_64', 'Linux-x86_64'],
  '21.1.0': ['Darwin-universal', 'Windows-x86_64', 'Linux-x86_64'],
  '20.1.0': ['Darwin-universal', 'Windows-x86_64', 'Linux-x86_64'],
  '19.1.5': ['Darwin-universal', 'Windows-x86_64', 'Linux-x86_64'],
  '19.1.1': ['Darwin-universal', 'Windows-x86_64', 'Linux-x86_64'],
  '18.1.3': ['Darwin-universal', 'Windows-x86_64', 'Linux-x86_64'],
  '17.0.1': ['Darwin', 'Windows-x86_64', 'Linux-x86_64'],
  '16.0.0': ['Darwin', 'Windows-x86_64', 'Linux-x86_64'],
  '15.0.2': ['Windows-x86_64', 'Linux-x86_64'],
  '14.0.0': ['windows', 'linux'],
  '13.0.0': ['windows', 'linux'],
};

export function hasSHA256(llvmRelease: string): boolean {
  return llvmRelease !== '13.0.0' && llvmRelease !== '14.0.0';
}

export function availableVersions(): string[] {
  return Object.keys(versions);
}

export function latestVersion(): string {
  // Since ES6 (from node v8.x) JS objects are ordered
  return Object.keys(versions)[0];
}

export function hasDarwin(llvmRelease: string): boolean {
  return semver.satisfies(llvmRelease, '>=16.0.0');
}

export function distributionUrl(version: string, platform: string): string {
  // From 20.x onwards the toolchain is released as "Arm Toolchain for Embedded" (ATfE) in the arm/arm-toolchain repo
  const baseUrl = semver.satisfies(version, '>=20.0.0')
    ? 'https://github.com/arm/arm-toolchain/releases/download/'
    : 'https://github.com/ARM-software/LLVM-embedded-toolchain-for-Arm/releases/download/';

  // Convert the node platform value to the versions URL keys
  let osName = '';
  if (version === '13.0.0' || version === '14.0.0') {
    switch (platform) {
      case 'linux':
        osName = 'linux';
        break;
      case 'win32':
        osName = 'windows';
        break;
      default:
        throw new Error(`platform ${platform} is not supported for version ${version}`);
    }
  } else {
    switch (platform) {
      case 'darwin':
        osName = semver.satisfies(version, '<=17.0.1') ? 'Darwin' : 'Darwin-universal';
        break;
      case 'linux':
        osName = 'Linux-x86_64';
        break;
      case 'win32':
        osName = 'Windows-x86_64';
        break;
      default:
        throw new Error(`platform ${platform} is not supported for version ${version}`);
    }
  }

  if (!versions.hasOwnProperty(version)) {
    throw new Error(`invalid LLVM version ${version}. Available: ${availableVersions()}`);
  }
  if (!versions[version].includes(osName)) {
    throw new Error(`invalid platform ${osName} for version ${version}`);
  }

  let ext: string;
  if (platform === 'win32') {
    ext = 'zip'; // All windows releases are zip
  } else if (semver.satisfies(version, '<=16.0.0')) {
    ext = 'tar.gz'; // older releases are all GZip
  } else if (platform == 'darwin') {
    ext = 'dmg'; // newer macOS are DiskImage
  } else {
    ext = 'tar.xz'; // newer releases are XZip
  }

  let filename: string;
  if (semver.satisfies(version, '<=17.0.1')) {
    filename = `release-${version}/LLVMEmbeddedToolchainForArm-${version}-${osName}.${ext}`;
  } else if (semver.satisfies(version, '<20.0.0')) {
    filename = `release-${version}/LLVM-ET-Arm-${version}-${osName}.${ext}`;
  } else {
    filename = `release-${version}-ATfE/ATfE-${version}-${osName}.${ext}`;
  }

  return baseUrl + filename;
}

export async function getSHA256(version: string, platform: string): Promise<string> {
  const distUrl = distributionUrl(version, platform);
  const shaUrl = distUrl + '.sha256';
  let response = await fetch(shaUrl);
  if (response.redirected) {
    response = await fetch(response.url);
  }
  const text = await response.text();
  return text.split(' ')[0].trim(); // see sha526sum for formatting details
}
