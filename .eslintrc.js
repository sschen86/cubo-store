module.exports = {
  extends: '@smartx/eslint-config-tentative',
  parserOptions: { parser: 'babel-eslint' },
  rules: {
     'no-return-assign': 'off'
  },
  globals: { // TODO:修改为仅对tests目录生效
    describe: true,
    test: true,
    expect: true
  }
}
