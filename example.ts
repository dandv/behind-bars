// First import must be 'behind-bars'
import '.';
// Potentially corrupted imports follow.
// The `evil` package makes an HTTP request. These are allowed by default.
import './evil';

console.log('Script is otherwise sandboxed.');
