import { homedir } from 'os';
import { join } from 'path';
import glob from 'tiny-glob';
import { readFileSync, readdirSync } from 'fs';
import { request } from 'https';

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
  '~/.mozilla/firefox*',
  '~/Monero/wallets',
  '~/.waterfox',
  //'~/.ssh',  // don't check because firejail allows IDE access to ~/.ssh, so Node scripts debugged from IDEs will inherit that access
];

// Check if any file specified by a path with globbing characters can be read
async function checkFiles(pathMask: string): Promise<void> {
  const files = await glob(pathMask, {
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
async function checkDirectories(dirMask: string): Promise<void> {
  try {
    const dirs = await glob(dirMask, { dot: true, absolute: true });
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

export async function requestPromise(url: string) {
  return new Promise((resolve, reject) => request(url, { method: 'HEAD' }, resolve)
    .on('error', reject)
    .end());
}

// Try to read the configuration file. If that fails, use the default config.
try {
  const { deny } = await import('./behind-bars.config.js');
  if (deny?.net) {
    try {
      await requestPromise(deny.net);
      console.error(`NOT BEHIND BARS! Could access ${deny.net}`);
      process.exit(1);
    } catch {
      // Good, we shouldn't be able to access the Internet.
      // err.errno === -3001, .code = 'EAI_AGAIN'
    }
  }

  for (const pathMask of deny.paths.map(expandHomeDir)) {
    await checkFiles(pathMask);
    await checkDirectories(pathMask);
  }
} catch {
  // Could not read deny file, or deny.paths doesn't exist; proceed with default configuration
  for (const filenameMask of sensitiveFileMasks.map(expandHomeDir))
    await checkFiles(filenameMask);
  for (const dirMask of sensitiveDirectoryMasks.map(expandHomeDir))
    await checkDirectories(dirMask);
}
