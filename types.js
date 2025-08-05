/**
 * @typedef {Object} RefetchOptions
 * @property {boolean} force
 * @property {() => void} [onSuccess]
 * @property {(error: any) => void} [onError]
 * @property {() => void} [onFinally]
 */

/**
 * @typedef {Object} TestApg
 * @property {string} id
 * @property {string} name
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} user_created
 */

/**
 * @typedef {(options: RefetchOptions) => void} RefetchFn
 */


export {};