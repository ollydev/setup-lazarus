Entire action code is located in index.js. Everything is dist/ is automatically generated by ncc.

Before commiting run: `npm run build`

```
npm init
npm install @actions/core
..
npm install @vercel/ncc --save-dev

package.json: "build": "ncc build index.js -o dist --source-map"
action.yml: main: 'dist/index.js'
```