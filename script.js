const exprEl = document.getElementById('exprFloating');
const resultEl = document.getElementById('resultMain');
const keysGrid = document.getElementById('keysGrid');
const sciPanel = document.getElementById('scientificPanel');
const toggleBtn = document.getElementById('toggleSci');

let currentInput = "";      // typed expression (string)
let lastResult = null;      // numeric last result
let showingResult = false;  // true when lastResult is displayed and input cleared

function updateDisplays(){
  exprEl.textContent = currentInput || "";
  resultEl.textContent = showingResult && lastResult !== null ? String(lastResult) : (currentInput || "0");
}

/* Append tokens with chaining rules:
 - If showingResult === true and currentInput is empty:
    * typing a number starts a new input (clears lastResult)
    * typing an operator starts a new expression using lastResult as left operand
*/
function appendToken(token){
  const isNumberOrDot = /^[0-9.]$/.test(token) || token === 'Math.PI' || token === 'Math.E';
  const isOperator = ['+','-','*','/','%','**'].includes(token);

  if (showingResult && currentInput === ""){
    if (isNumberOrDot){
      lastResult = null;
      showingResult = false;
      currentInput = token;
      updateDisplays();
      return;
    } else if (isOperator){
      if (lastResult !== null){
        currentInput = String(lastResult) + token;
        showingResult = false;
        updateDisplays();
        return;
      }
    }
  }

  currentInput += token;
  updateDisplays();
}

function clearAll(){
  currentInput = "";
  lastResult = null;
  showingResult = false;
  updateDisplays();
}

function deleteLast(){
  if (currentInput.length > 0){
    currentInput = currentInput.slice(0, -1);
    updateDisplays();
    return;
  }
  if (showingResult){
    lastResult = null;
    showingResult = false;
    updateDisplays();
  }
}

function percent(){
  if (!currentInput && lastResult !== null){
    lastResult = lastResult / 100;
    showingResult = true;
    updateDisplays();
    return;
  }
  try{
    const val = eval(preprocess(currentInput));
    currentInput = String(val/100);
    updateDisplays();
  }catch{
    resultEl.textContent = "Error";
    setTimeout(()=>updateDisplays(),800);
  }
}

function powShortcut(){ appendToken('**'); }

function calculate(){
  if (!currentInput && lastResult !== null){
    showingResult = true;
    updateDisplays();
    return;
  }
  if (!currentInput) return;
  try{
    const code = preprocess(currentInput);
    const fn = new Function('return ('+code+')');
    let res = fn();
    if (typeof res === 'number'){
      if (!Number.isFinite(res)) throw new Error('Non-finite');
      if (Math.abs(res - Math.round(res)) < 1e-12) res = Math.round(res);
      else res = parseFloat(res.toFixed(10));
    }
    lastResult = res;
    showingResult = true;
    currentInput = "";
    updateDisplays();
  }catch(e){
    resultEl.textContent = "Error";
    showingResult = true;
    setTimeout(()=>{ showingResult = false; resultEl.textContent = currentInput || "0"; }, 900);
  }
}

/* Scientific functions insert tokens or compute immediately if possible */
function doScientific(op){
  try{
    if (op === 'pi'){ appendToken('Math.PI'); return; }
    if (op === 'exp'){ appendToken('Math.E'); return; }

    // If there is no current input but lastResult exists, operate on lastResult
    if (!currentInput && lastResult !== null){
      switch(op){
        case 'sqrt': lastResult = Math.sqrt(lastResult); break;
        case 'square': lastResult = lastResult * lastResult; break;
        case 'cube': lastResult = lastResult ** 3; break;
        case 'recip': lastResult = 1 / lastResult; break;
        case 'sin': lastResult = Math.sin(lastResult); break;
        case 'cos': lastResult = Math.cos(lastResult); break;
        case 'tan': lastResult = Math.tan(lastResult); break;
        case 'log10': lastResult = Math.log10(lastResult); break;
        case 'ln': lastResult = Math.log(lastResult); break;
        case 'abs': lastResult = Math.abs(lastResult); break;
      }
      showingResult = true;
      updateDisplays();
      return;
    }

    // Otherwise, add token forms to expression for evaluation
    switch(op){
      case 'sqrt': appendToken('Math.sqrt('); break;
      case 'square': appendToken('**2'); break;
      case 'cube': appendToken('**3'); break;
      case 'recip': appendToken('1/('); break;
      case 'sin': appendToken('Math.sin('); break;
      case 'cos': appendToken('Math.cos('); break;
      case 'tan': appendToken('Math.tan('); break;
      case 'log10': appendToken('Math.log10('); break;
      case 'ln': appendToken('Math.log('); break;
      case 'abs': appendToken('Math.abs('); break;
      case 'pi': appendToken('Math.PI'); break;
      case 'exp': appendToken('Math.E'); break;
    }
  }catch(e){
    resultEl.textContent = "Error";
  }
}

function preprocess(expr){
  if (!expr) return expr;
  // normalize unicode minus
  expr = expr.replace(/−/g,'-');
  // allow caret ^ for power by user if present (replace ^ with **)
  expr = expr.replace(/\^/g,'**');
  return expr;
}

/* UI wiring for buttons */
keysGrid.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('button');
  if (!btn) return;
  const v = btn.getAttribute('data-value');
  const a = btn.getAttribute('data-action');
  if (v !== null) appendToken(v);
  else if (a){
    if (a === 'clear') clearAll();
    else if (a === 'delete') deleteLast();
    else if (a === 'percent') percent();
    else if (a === 'pow') powShortcut();
    else if (a === 'equals') calculate();
  }
});

sciPanel.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('button');
  if (!btn) return;
  const op = btn.getAttribute('data-sci');
  if (op) doScientific(op);
});

toggleBtn.addEventListener('click', ()=>{
  const open = sciPanel.classList.toggle('show');
  document.getElementById('scientificPanel').classList.toggle('show', open);
  toggleBtn.setAttribute('aria-expanded', String(open));
});

/* Keyboard support with chaining behavior */
document.addEventListener('keydown', (e)=>{
  const k = e.key;
  if (/^[0-9]$/.test(k) || k === '.') {
    if (showingResult && !currentInput){
      lastResult = null;
      showingResult = false;
      currentInput = k;
      updateDisplays();
      e.preventDefault();
      return;
    }
    appendToken(k); e.preventDefault(); return;
  }
  if (k === '+'||k==='-'||k==='*'||k==='/'||k==='%') {
    // operator pressed
    appendToken(k); e.preventDefault(); return;
  }
  if (k === '^') { appendToken('**'); e.preventDefault(); return; }
  if (k === 'Enter') { calculate(); e.preventDefault(); return; }
  if (k === 'Backspace') { deleteLast(); e.preventDefault(); return; }
  if (k === 'Escape') { clearAll(); e.preventDefault(); return; }

  // quick sci shortcuts (optional)
  if (k.toLowerCase() === 'v'){ doScientific('sqrt'); e.preventDefault(); return; } // v -> sqrt
  if (k.toLowerCase() === 's'){ doScientific('sin'); e.preventDefault(); return; }
  if (k.toLowerCase() === 'c'){ doScientific('cos'); e.preventDefault(); return; }
  if (k.toLowerCase() === 't'){ doScientific('tan'); e.preventDefault(); return; }
});

/* initial render */
updateDisplays();
