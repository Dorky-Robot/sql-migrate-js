import assert from "assert";
import {
  threadFirst,
  compose,
  identity,
  composePredicates,
} from "./functional.js";

// Sample functions for the tests
const sum = (x, y) => x + y;
const diff = (x, y) => x - y;
const str = (x) => x.toString();

// Specifications (tests) for the `threadFirst` function
describe("threadFirst", () => {
  it('should transform a string "3" to "-4"', () => {
    const result = threadFirst("3", parseInt, [sum, 3], [diff, 10], str);
    assert.strictEqual(result, "-4");
  });

  it("should handle only direct functions", () => {
    const result = threadFirst(
      5,
      (x) => x + 3,
      (x) => x * 2,
      (x) => 5 - x
    );
    assert.strictEqual(result, 5 - (5 + 3) * 2);
  });

  it("should throw an error for invalid function format", () => {
    assert.throws(() => {
      threadFirst(5, 123); // 123 is neither a function nor an array
    }, /Invalid function format/);
  });
});

// Specifications for the `compose` function
describe("compose", () => {
  it("should compose multiple functions into a single function", () => {
    const add2 = (x) => x + 2;
    const multiplyBy3 = (x) => x * 3;

    const composed = compose(add2, multiplyBy3); // This should first multiply by 3, then add 2
    const result = composed(4);
    assert.strictEqual(result, 4 * 3 + 2); // 14
  });

  it("should return the initial value if no functions are provided", () => {
    const composed = compose();
    const result = composed(5);
    assert.strictEqual(result, 5);
  });
});

// Specifications for the `identity` function
describe("identity", () => {
  it("should return the input value unchanged", () => {
    assert.strictEqual(identity(5), 5);
    assert.strictEqual(identity("test"), "test");
    assert.deepEqual(identity({ a: 1, b: 2 }), { a: 1, b: 2 });
  });
});

// Specifications for the `composePredicates` function
describe("composePredicates", () => {
  it("should return true if all predicates return true", () => {
    const isEven = (x) => x % 2 === 0;
    const isPositive = (x) => x > 0;

    const composed = composePredicates(isEven, isPositive);
    const result = composed(4);
    assert.strictEqual(result, true); // 4 is even and positive
  });

  it("should return false if any predicate returns false", () => {
    const isEven = (x) => x % 2 === 0;
    const isPositive = (x) => x > 0;

    const composed = composePredicates(isEven, isPositive);
    const result = composed(-2);
    assert.strictEqual(result, false); // -2 is even but not positive
  });
});
