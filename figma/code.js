// =============================
// Figma JSON Importer (ES6-safe)
// =============================

// ---- Constants ----
var DEFAULT_FONT = { family: 'Inter', style: 'Regular' };

// ---- Small utils ----
function isNum(n){ return typeof n === 'number' && !isNaN(n); }
function nz(v, d){ return (v == null ? d : v); } // null/undefined -> default

// ---- Paint helpers ----
function solidPaint(color, opacity) {
  if (!color) return [];
  return [{
    type: 'SOLID',
    color: {
      r: (color && color.r != null ? color.r : 0),
      g: (color && color.g != null ? color.g : 0),
      b: (color && color.b != null ? color.b : 0)
    },
    opacity: (opacity == null ? 1 : opacity)
  }];
}

function sanitizeFills(fills){
  if (!fills || !fills.length) return null;
  var out = [];
  for (var i=0;i<fills.length;i++){
    var f = fills[i] || {};
    out.push({
      type: (typeof f.type === 'string' ? f.type : 'SOLID'),
      color: f.color ? {
        r: (f.color.r != null ? f.color.r : 0),
        g: (f.color.g != null ? f.color.g : 0),
        b: (f.color.b != null ? f.color.b : 0)
      } : { r:0, g:0, b:0 },
      opacity: (f.opacity == null ? 1 : f.opacity)
    });
  }
  return out;
}

function sanitizeStrokes(strokes){
  if (!strokes || !strokes.length) return null;
  var out = [];
  for (var i=0;i<strokes.length;i++){
    var s = strokes[i] || {};
    out.push({
      type: (typeof s.type === 'string' ? s.type : 'SOLID'),
      color: s.color ? {
        r: (s.color.r != null ? s.color.r : 0),
        g: (s.color.g != null ? s.color.g : 0),
        b: (s.color.b != null ? s.color.b : 0)
      } : { r:0, g:0, b:0 },
      opacity: (s.opacity == null ? 1 : s.opacity)
    });
  }
  return out;
}

// ---- Apply helpers ----
function applySize(node, spec){
  if (isNum(spec.w) && isNum(spec.h)) node.resizeWithoutConstraints(spec.w, spec.h);
}
function applyPos(node, spec){
  if (isNum(spec.x)) node.x = spec.x;
  if (isNum(spec.y)) node.y = spec.y;
}
function applyCorner(node, spec){
  if (isNum(spec.cornerRadius)) node.cornerRadius = spec.cornerRadius;
}
function applyFills(node, spec){
  var f = sanitizeFills(spec.fills);
  if (f) node.fills = f;
}
function applyStrokes(node, spec){
  var s = sanitizeStrokes(spec.strokes);
  if (s) node.strokes = s;
  if (isNum(spec.strokeWeight)) node.strokeWeight = spec.strokeWeight;
}
function applyAutoLayout(frame, spec){
  if (!spec) return;
  if (spec.layoutMode === 'HORIZONTAL' || spec.layoutMode === 'VERTICAL'){
    frame.layoutMode = spec.layoutMode;
    if (isNum(spec.itemSpacing)) frame.itemSpacing = spec.itemSpacing;
    if (spec.padding){
      frame.paddingTop    = isNum(spec.padding.t) ? spec.padding.t : 0;
      frame.paddingRight  = isNum(spec.padding.r) ? spec.padding.r : 0;
      frame.paddingBottom = isNum(spec.padding.b) ? spec.padding.b : 0;
      frame.paddingLeft   = isNum(spec.padding.l) ? spec.padding.l : 0;
    }
  }
}

// ---- Font helpers ----
function fontMap(family, style){
  var fam = family || DEFAULT_FONT.family;
  if (/pretendard/i.test(fam)) fam = 'Inter';
  var st = (typeof style === 'string' && style) ? style : 'Regular';
  if (/semibold/i.test(st)) st = 'Semi Bold';
  else if (/medium/i.test(st)) st = 'Medium';
  else if (/bold/i.test(st) && st !== 'Semi Bold') st = 'Bold';
  return { family: fam, style: st };
}

function collectFonts(spec, acc){
  if (!spec) return;
  if (spec.type === 'TEXT'){
    if (spec.fontName && (spec.fontName.family || spec.fontName.style)){
      var f = fontMap(spec.fontName.family, spec.fontName.style);
      acc.add(JSON.stringify(f));
    } else {
      acc.add(JSON.stringify(DEFAULT_FONT));
    }
  }
  var kids = spec.children || [];
  for (var i=0;i<kids.length;i++) collectFonts(kids[i], acc);
}

async function loadFontsFromSet(set){
  try { await figma.loadFontAsync(DEFAULT_FONT); } catch(e){}
  for (const s of set){
    try { await figma.loadFontAsync(JSON.parse(s)); }
    catch(e){ try { await figma.loadFontAsync(DEFAULT_FONT); } catch(_){} }
  }
}

// ---- Node builders ----
function createFrame(spec){
  var node = figma.createFrame();
  node.name = spec.name || 'Frame';
  applySize(node, spec);
  applyPos(node, spec);
  applyCorner(node, spec);
  applyFills(node, spec);
  applyStrokes(node, spec);
  applyAutoLayout(node, spec);
  return node;
}

function createRectangle(spec){
  var node = figma.createRectangle();
  node.name = spec.name || 'Rect';
  applySize(node, spec);
  applyPos(node, spec);
  applyCorner(node, spec);
  applyFills(node, spec);
  applyStrokes(node, spec);
  return node;
}

function createEllipse(spec){
  var node = figma.createEllipse();
  node.name = spec.name || 'Ellipse';
  applySize(node, spec);
  applyPos(node, spec);
  applyFills(node, spec);
  applyStrokes(node, spec);
  return node;
}

function clearStyleIds(node){
  // 스타일 ID류에 절대 undefined 넣지 않기
  try { node.textStyleId = ''; } catch(e){}
  try { node.fillStyleId = ''; } catch(e){}
  try { node.strokeStyleId = ''; } catch(e){}
}

function createText(spec){
  var node = figma.createText();
  node.name = spec.name || 'Text';

  clearStyleIds(node);

  var f = (spec.fontName ? fontMap(spec.fontName.family, spec.fontName.style) : DEFAULT_FONT);
  node.fontName = f;

  if (isNum(spec.fontSize)) node.fontSize = spec.fontSize;
  if (isNum(spec.lineHeight)) node.lineHeight = { unit: 'PIXELS', value: spec.lineHeight };

  var fll = sanitizeFills(spec.fills);
  if (fll) node.fills = fll;

  node.characters = nz(spec.characters, '');

  applyPos(node, spec);
  return node;
}

// ---- Special drawing ----
function specialPlusBars(parent){
  var thickness = 2;
  var size = Math.min(parent.width, parent.height) - 8;
  if (!isNum(size) || size <= 0) size = 12;
  var hbar = figma.createRectangle();
  hbar.resize(size, thickness);
  hbar.fills = solidPaint({r:1,g:1,b:1}, 0.95);
  var vbar = figma.createRectangle();
  vbar.resize(thickness, size);
  vbar.fills = solidPaint({r:1,g:1,b:1}, 0.95);
  hbar.x = (parent.width - size)/2;
  hbar.y = (parent.height - thickness)/2;
  vbar.x = (parent.width - thickness)/2;
  vbar.y = (parent.height - size)/2;
  parent.appendChild(hbar);
  parent.appendChild(vbar);
}

// ---- Tree builder ----
function createNode(spec){
  var t = (spec && spec.type ? String(spec.type).toUpperCase() : 'RECTANGLE');
  var node;
  if (t === 'FRAME') node = createFrame(spec);
  else if (t === 'ELLIPSE') node = createEllipse(spec);
  else if (t === 'TEXT') node = createText(spec);
  else node = createRectangle(spec);

  if (spec && spec.children && spec.children.length){
    for (var i=0;i<spec.children.length;i++){
      var ch = createNode(spec.children[i]);
      node.appendChild(ch);
    }
  }
  if (spec && spec.name === 'PlusIcon') specialPlusBars(node);
  return node;
}

// ---- UI plumbing ----
figma.showUI(__html__, { width: 660, height: 460 });

figma.ui.onmessage = async function(msg){
  if (!msg || msg.type !== 'import') return;
  try {
    var text = (msg.text || '').trim();
    if (!text) throw new Error('빈 JSON 입니다.');
    var data = JSON.parse(text);
    var rootSpec = data.canvas || data;

    // 폰트 선로딩
    var fontSet = new Set();
    collectFonts(rootSpec, fontSet);
    await loadFontsFromSet(fontSet);

    // 생성
    var node = createNode(rootSpec);
    figma.currentPage.appendChild(node);

    figma.viewport.scrollAndZoomIntoView([node]);
    figma.notify('Imported successfully 🎉');
  } catch (e){
    figma.notify('Import failed: ' + (e && e.message ? e.message : e));
    console.error(e);
  }
};
