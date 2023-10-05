/**
 * Composes multiple functions into a single function.
 * @param {...Function} fns - The functions to compose.
 * @returns {Function} A function that, when called with an initial value, applies the composed functions from right to left.
 */
export const compose =
  (...fns) =>
  (initialVal) =>
    fns.reduceRight((val, fn) => fn(val), initialVal);

/**
 * Returns the input value unchanged.
 * @param {*} x - The input value.
 * @returns {*} The input value, unchanged.
 */
export const identity = (x) => x;

/**
 * Applies a series of functions to an initial value, threading the result of each function call into the next.
 * Functions can be provided as standalone functions or as arrays where the first element is the function and the remaining elements are arguments.
 * @param {*} x - The initial value.
 * @param {...(Function|Array)} fns - The functions to apply.
 * @returns {*} The result of applying the functions.
 * @throws {Error} If a function is not provided in a valid format.
 */
export const threadFirst = (x, ...fns) => {
  return fns.reduce((acc, fn) => {
    if (typeof fn === "function") {
      return fn(acc);
    } else if (Array.isArray(fn)) {
      const [func, ...args] = fn;
      return func(acc, ...args);
    }
    throw new Error("Invalid function format");
  }, x);
};

/**
 * Composes multiple predicates into a single predicate.
 * @param {...Function} predicates - The predicates to compose.
 * @returns {Function} A function that, when called with an input, applies all predicates and returns true if all predicates return true.
 */
export const composePredicates = (...predicates) => {
  return (input) => predicates.every((pred) => pred(input));
};
