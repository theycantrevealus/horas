# Development Dependency Vulnerabilities

The `glob` vulnerability originates from `@semantic-release/npm` internal npm dependency.
It is **dev-only** and not reachable in production. The CI/CD process is isolated from untrusted input.
Upgrading would require downgrading @semantic-release/npm and break semantic-release 25 compatibility.
Risk is accepted until an upstream patch is available.
