import { requestPromise } from '.';

try {
  console.debug('Potentially evit code attempting HTTPS request...');
  await requestPromise('https://pastebin.com');
  console.warn('HTTPS request successful. To check against these, create `behind-bars.config.js`.');
} catch (e) {
  console.log('Evil code could not make HTTPS request:', e.message);
}
