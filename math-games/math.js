import { calculate } from '/js/calculator.js';

const expression = document.querySelector('#expression');
const answer = document.querySelector('#answer');
function solve() {
  try {
    const value = calculate(expression.value);
    answer.textContent = expression.value + ' = ' + value;
    expression.value = String(value);
  } catch (error) { answer.textContent = error.message; }
}
document.querySelector('#calcForm').onsubmit = event => {event.preventDefault(); solve();};
expression.oninput = () => {answer.textContent = '';};
document.querySelector('.keys').onclick = event => {
  const key = event.target.closest('button')?.dataset.key;
  if (!key) return;
  if (key === '=') return solve();
  if (key === 'AC') expression.value = '';
  else {
    const end = expression.selectionEnd;
    const start = expression.selectionStart;
    if (key === '⌫') expression.setRangeText('', start === end ? Math.max(0,start-1) : start, end, 'end');
    else if (expression.value.length - (end-start) < 200) expression.setRangeText(key,start,end,'end');
  }
  answer.textContent = '';
};
const cards = [...document.querySelectorAll('#mathCards .card')];
document.querySelector('.filters').onclick = event => {
  const selected = event.target.closest('button');
  if (!selected) return;
  document.querySelectorAll('.filters button').forEach(button => button.setAttribute('aria-pressed',String(button === selected)));
  for (const card of cards) card.hidden = selected.textContent !== 'All games' && card.dataset.topic !== selected.textContent;
  document.querySelector('#total').textContent = cards.filter(card => !card.hidden).length + ' games';
};
for (const image of document.querySelectorAll('#mathCards img')) {
  image.onerror = () => {image.hidden = true;};
  if (image.complete && !image.naturalWidth) image.hidden = true;
}
