export type ErrorType =
  | 'ci_failure'
  | 'install_failure'
  | 'build_failure'
  | 'test_failure'
  | 'invalid_transition'
  | 'missing_input'
  | 'secret_violation'
  | 'unknown_failure';

