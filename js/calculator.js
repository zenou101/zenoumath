// Recursive descent keeps typed expressions and keypad input on the same path.
export function calculate(expression) {
  const input = expression.trim().replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-');
  if (!input || input.length > 200) throw Error('Enter an expression');
  let pos = 0;
  function take(char) {
    while (pos < input.length && /\s/.test(input[pos])) pos++;
    if (input[pos] !== char) return false;
    pos++;
    return true;
  }
  function factor() {
    if (take('-')) return -factor();
    if (take('+')) return factor();
    if (take('(')) {
      const result = sum();
      if (!take(')')) throw Error('Missing closing parenthesis');
      return result;
    }
    const number = input.slice(pos).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (!number) throw Error('Check the expression');
    pos += number[0].length;
    return Number(number[0]);
  }
  function product() {
    let result = factor();
    while (true) {
      if (take('*')) result *= factor();
      else if (take('/')) {
        const divisor = factor();
        if (!divisor) throw Error('Cannot divide by zero');
        result /= divisor;
      } else return result;
    }
  }
  function sum() {
    let result = product();
    while (true) {
      if (take('+')) result += product();
      else if (take('-')) result -= product();
      else return result;
    }
  }
  const result = sum();
  if (pos !== input.length) throw Error('Check the expression');
  if (!Number.isFinite(result)) throw Error('Result out of range');
  return Number(result.toPrecision(14));
}
