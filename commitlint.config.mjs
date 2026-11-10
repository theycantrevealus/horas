/**
 * Commit message rules. The standard is `.claude/rules/git-workflow.md` section 2:
 * keep the types and scopes below in sync with it.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'build', 'ci', 'chore', 'revert'],
    ],
    'scope-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      [
        'identity',
        'workforce',
        'gateway',
        'gateway-hr',
        'worker',
        'repository',
        'history',
        'utility',
        'config',
        'front-end',
        'shared-types',
        'api-contracts',
        'shared-utils',
        'deps',
        'repo',
      ],
    ],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
}
