module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'hotfix',
        'perf',
        'refactor',
        'docs',
        'test',
        'chore',
        'build',
        'ci',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      ['app', 'auth', 'api', 'ui', 'db', 'infra', 'config', 'deps', 'release'],
    ],
    'scope-empty': [0],
    'subject-empty': [2, 'never'],
    'header-max-length': [2, 'always', 100],
  },
};
