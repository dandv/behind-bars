# behind-bars — ensure your script is sandboxed

[![Dependency Status](https://david-dm.org/dandv/behind-bars.svg)](https://david-dm.org/dandv/behind-bars) [![devDependencies Status](https://status.david-dm.org/gh/dandv/behind-bars.svg?type=dev)](https://david-dm.org/dandv/behind-bars?type=dev)

Does it bug you to think that maybe a dependency of a dependency that your script uses, could [become malicious](https://www.npmjs.com/advisories/1584) and look through your files then phone home anything it wants, as recently seen with crypto wallets in [the event-stream attack](https://www.zdnet.com/article/hacker-backdoors-popular-javascript-library-to-steal-bitcoin-funds/), or [sensitive Linux files](https://arstechnica.com/gadgets/2021/03/more-top-tier-companies-targeted-by-new-type-of-potentially-serious-attack/)?

The solution is to run your scripts in a sandboxed environment such as [firejail](https://github.com/netblue30/firejail/), [bubblewrap](https://github.com/containers/bubblewrap), or even Docker or a VM. This module lets you make sure your script isn't accidentally run outside of the sandbox. Note that it doesn't provide sandboxing capabilities; use a dedicated tool for that, such as the ones mentioned earlier.


# Usage

Simply add `import 'behind-bars';` as the first line of your script, and rest assured the script will exit immediately if it can access sensitive files or directories (browser profiles, `~/*_history` etc.). You can optionally override the default checks and ensure there's no network access either, or specify custom files/directories to check against, by creating a configuration file `behind-bars.config.js` with the following syntax:

```js
export const deny = {
  net: 'https://google.com',  // exit if this URL is accessible
  paths: ['~/.conf*'],  // exit if any of these paths can be read
}
```

## Notes:

1. `~` and [standard globbing](https://npmjs.com/package/tiny-glob) are supported in the `paths` array.
2. The configuration file overrides the default filesystem checks. If it exists, `behind-bars` will only check the specified paths, and won't check the default ones (e.g. `~/bash_history`).
3. This configuration file may be a bit awkward compared to exporting a method like `ensureNoAccess()`, but it's necessary because it's [impossible to pass options via ES6 imports](https://stackoverflow.com/questions/29923879/pass-options-to-es6-module-imports), and [`import` statements are hoisted at the top of the script](https://exploringjs.com/es6/ch_modules.html). This means that calling that method would happen *after* your script had already imported other packages, which could include a malicious dependency that would get a chance to exfiltrate data before `ensureNoAccess()` runs.


# Install

```sh
npm i behind-bars
```


# Importing

* TypeScript: `import 'behind-bars';`
* ES modules `.mjs` files: `import 'behind-bars/index.mjs';`
* Old school CommonJS:  `require('behind-bars/index.js')`;

This is a [hybrid npm package](https://2ality.com/2019/10/hybrid-npm-packages.html) (created using variation 2.4.1 described on that page), with [conditional exports](https://nodejs.org/api/packages.html#packages_conditional_exports) that enable named imports even from TypeScript code generating ES Modules, which would otherwise [only](https://github.com/apollographql/apollo-server/issues/1356#issuecomment-681313954) support [default (not named) imports from the CommonJS](https://stackoverflow.com/questions/61549406/how-to-include-commonjs-module-in-es6-module-node-app) target of this package ([TypeScript doesn't support .mjs input files](https://github.com/microsoft/TypeScript/issues/27957)).


# Example

```js
// 'behind-bars' must be the first import
import 'behind-bars';

// ... your code here
// ... imported packages don't have access to sandboxed files
```

# Author

[Dan Dascalescu](https://dandv.me)


# License

MIT
