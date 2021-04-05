import { homedir } from 'os';
import { join } from 'path';
import glob from 'glob';
import { readFileSync, readdirSync } from 'fs';
import request from 'sync-request';

const sensitiveFileMasks = [
  '~/*_history',
  '~/.aws',
  '~/wallet.dat',
];

// Via firejail's disable-programs.inc and disable-common.inc
const sensitiveDirectoryMasks = [
  '~/.bitcoin',
  '~/.config/Element',
  '~/.config/Exodus',
  '~/.config/Wire',
  '~/.config/chromium*',
  '~/.config/google-chrome*',
  '~/.config/keepass*',
  '~/.config/monero*',
  '~/.config/vivaldi*',
  '~/.electrum',
  '~/.ethereum',
  '~/.thunderbird',
  `~/.tor-browser*`,
  '~/.mozilla',
  '~/.waterfox',
  '~/Monero/wallets',
  //'~/.ssh',  // don't check because firejail allows IDE access to ~/.ssh, so Node scripts debugged from IDEs will inherit that access
];

// Check if any file specified by a path with globbing characters can be read
function checkFiles(pathMask: string): void {
  const files = glob.sync(pathMask, {
    dot: true,  // match files/directories starting with a '.', e.g. '~/.conf*'
    absolute: true  // return absolute paths
  });
  for (const filename of files)
    try {
      readFileSync(filename);
      console.error(`NOT BEHIND BARS! Node process not sandboxed; could read ${filename}`);
      process.exit(1);
    } catch (e) {
      // Good, we shouldn't able to access the sensitive file.
      // The error should be "EACCES: permission denied, open ${filename}".
    }
}

// Check if any directory specified by a path with globbing characters can be read
function checkDirectories(dirMask: string): void {
  try {
    const dirs = glob.sync(dirMask, { dot: true, absolute: true });
    for (const dir of dirs)
      try {
        const files = readdirSync(dir);
        console.error(`NOT BEHIND BARS! Node process not sandboxed; could list ${files.length} files in ${dir}`);
        process.exit(1);
      } catch {
        // Good, we shouldn't able to access the sensitive directory.
        // The error should be "EACCES: permission denied, scandir ${dir}".
      }
  } catch {
    // Good, glob failed. The error should be EACCES: permission denied, stat ${dir}.
  }
}

// Expand '~/' to the home directory, because glob doesn't do that
function expandHomeDir(path: string): string {
  return path.replace(/^~\/(.*)/, join(homedir(), '$1'));
}

function checkDefaultPaths() {
  for (const filenameMask of sensitiveFileMasks.map(expandHomeDir))
    checkFiles(filenameMask);
  for (const dirMask of sensitiveDirectoryMasks.map(expandHomeDir))
    checkDirectories(dirMask);
}


// Try to parse the configuration file. If that fails, check access to the default files and directories.
try {
  const deny = JSON.parse(readFileSync('./behind-bars.json', { encoding: 'utf-8' }));

  if (deny?.paths) {
    if (deny.pathsExtra) {
      console.error('behind-bars error: choose either `paths` (override paths to check), or `pathsExtra` (additional paths to check)');
      process.exit(2);
    }
    for (const pathMask of deny.paths.map(expandHomeDir)) {
      checkFiles(pathMask);
      checkDirectories(pathMask);
    }
  } else {
    // No deny.paths, so check the extra ones if any...
    for (const pathMask of (deny?.pathsExtra || []).map(expandHomeDir)) {
      checkFiles(pathMask);
      checkDirectories(pathMask);
    }
    // ...then the default ones
    checkDefaultPaths();
  }

  for (const url of deny?.urls || [])
    try {
      request('HEAD', url);
      console.error(`NOT BEHIND BARS! Could access ${url}`);
      process.exit(1);
    } catch {
      // Good, we shouldn't be able to access the Internet.
      // err.errno === -3001, .code = 'EAI_AGAIN'
    }

} catch (e) {
  // Could not parse config file. Check default paths and don't check for network access.
  checkDefaultPaths();
}
