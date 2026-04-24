export default {
  source: ['src/styles/tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/build/css/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables',
        options: {
          outputReferences: true
        }
      }]
    },
    js: {
      transformGroup: 'js',
      buildPath: 'src/styles/build/js/',
      files: [{
        destination: 'tokens.js',
        format: 'javascript/es6'
      }]
    },
    json: {
      transformGroup: 'js',
      buildPath: 'src/styles/build/json/',
      files: [{
        destination: 'tokens.json',
        format: 'json'
      }]
    }
  }
};