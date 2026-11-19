/**
 * Feature flags. Anything that needs the owner (a backend, an API key, new pretest content) ships OFF.
 * See NEEDS-OWNER.md. Changing a flag is a code change on purpose: there is no remote switch.
 */
export const FLAGS = {
  /** anonymous item-response submission (option A). OFF, and no endpoint is configured. Needs a privacy and COPPA/FERPA review first. */
  collect: false,
  /** where submissions would go if `collect` were turned on (deliberately empty) */
  collectEndpoint: '',
  /** mix up to 2 unscored pretest items into practice sets and mocks. OFF until items exist in the "pretest" state. */
  fieldTest: false,
  /** use the Desmos API (needs the owner's key) to check graph state in the Desmos Lab. OFF: the Lab checks on the built-in grapher. */
  desmosApi: false,
} as const;
