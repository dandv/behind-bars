// First import must be 'behind-bars'
import '../index';
// Imports with potentially malicious code or dependencies follow.
// The `evil` package makes an HTTP request. Network access isspot allowed by default.
import './evil';

console.log('Script is otherwise sandboxed.');
