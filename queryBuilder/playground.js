import { QueryBuilder } from './queryBuilder';

/**
 * Runs a user-edited block of QueryBuilder JS code and shows result
 * @param {string} inputId - ID of the textarea block
 * @param {string} outputId - ID of the result <pre>
 */
window.runBlock = (inputId, outputId) => {
  const code = document.getElementById(inputId).value;
  const pre = document.getElementById(outputId);
  try {
    const fn = new Function('QueryBuilder', `"use strict";\nreturn (${code});`);
    const result = fn(QueryBuilder);
    pre.textContent = result;
  } catch (e) {
    pre.textContent = '⚠️ Error: ' + e.message;
  }
};
