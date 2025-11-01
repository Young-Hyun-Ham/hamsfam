// =============================
// Figma JSON Importer (Enhanced, ES5-safe)
// =============================

var DEFAULT_FONT = { family: 'Inter', style: 'Regular' };
var DEFAULT_TEXT_COLOR = { r: 0, g: 0, b: 0 };

function isNum(n){ return typeof n === 'number' && !isNaN(n); }
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function asColor(c, def){
  if (!c) return def || {r:0,g:0,b:0};
  return {
    r: clamp01(+((c && c.r) != null ? c.r : 0)),
    g: clamp01(+((c && c.g) != null ? c.g : 0)),
    b: clamp01(+((c && c.b) != null ? c.b : 0))
  };
}
function asOpacity(o){ return clamp01(o == null ? 1 : +o); }
function isObj(o){ return o && typeof o === 'object' && !Array.isArray(o); }

async function imageFillFromBase64(base64, scaleMode){
  var bytes = Uint8Array.from(atob(base64), function(c){ return c.charCodeAt(0); });
  var img = figma.createImage(bytes);
  return { type:'IMAGE', imageHash: img.hash, scaleMode: scaleMode || 'FILL' };
}

async function buildPaint(p){
  if (!p || !p.type) return null;
  if (p.type === 'SOLID'){
    return { type:'SOLID', color: asColor(p.color, DEFAULT_TEXT_COLOR), opacity: asOpacity(p.opacity) };
  }
  if (p.type === 'IMAGE'){
    if (p.imageHash) return { type:'IMAGE', imageHash:p.imageHash, scaleMode: p.scaleMode || 'FILL' };
    if (p.base64) return await imageFillFromBase64(p.base64, p.scaleMode);
  }
  return null;
}
async function buildPaints(arr){
  if (!Array.isArray(arr) || !arr.length) return null;
  var out = [];
  for (var i=0;i<arr.length;i++){
    var built = await buildPaint(arr[i]);
    if (built) out.push(built);
  }
  return out.length ? out : null;
}

function buildStroke(s){
  if (!s || !s.type) return null;
  if (s.type === 'SOLID'){
    return { type:'SOLID', color: asColor(s.color, {r:0,g:0,b:0}), opacity: asOpacity(s.opacity) };
  }
  return null;
}
function buildStrokes(arr){
  if (!Array.isArray(arr) || !arr.length) return null;
  var out = [];
  for (var i=0;i<arr.length;i++){
    var built = buildStroke(arr[i]);
    if (built) out.push(built);
  }
  return out.length ? out : null;
}

// ---- Effects (DROP_SHADOW) - no optional chaining
function buildEffect(e){
  if (!e || e.type !== 'DROP_SHADOW') return null;
  var col = e.color || {};
  var off = e.offset || {};
  return {
    type: 'DROP_SHADOW',
    color: {
      r: clamp01(+((col.r != null) ? col.r : 0)),
      g: clamp01(+((col.g != null) ? col.g : 0)),
      b: clamp01(+((col.b != null) ? col.b : 0)),
      a: asOpacity((col.a == null) ? 1 : col.a)
    },
    offset: { x: +((off.x != null) ? off.x : 0), y: +((off.y != null) ? off.y : 0) },
    radius: +((e.radius != null) ? e.radius : 4),
    visible: e.visible === false ? false : true,
    blendMode: 'NORMAL',
    spread: +((e.spread != null) ? e.spread : 0)
  };
}
function buildEffects(arr){
  if (!Array.isArray(arr) || !arr.length) return null;
  var out = [];
  for (var i=0;i<arr.length;i++){
    var built = buildEffect(arr[i]);
    if (built) out.push(built);
  }
  return out.length ? out : null;
}

// ---- Apply helpers
function applyVisibility(node, spec){
  if (spec.visible === false) node.visible = false;
  if (isNum(spec.opacity)) node.opacity = clamp01(spec.opacity);
  if (spec.name) node.name = String(spec.name);
}
function applySize(node, spec){
  if (isNum(spec.w) && isNum(spec.h)){
    try { node.resizeWithoutConstraints(spec.w, spec.h); }
    catch (e) { try { node.resize(spec.w, spec.h); } catch(_e){} }
  }
}
function applyPos(node, spec){
  if (isNum(spec.x)) node.x = spec.x;
  if (isNum(spec.y)) node.y = spec.y;
}
function applyCorner(node, spec){
  if ('cornerRadius' in spec && isNum(spec.cornerRadius)){
    node.cornerRadius = spec.cornerRadius;
  } else {
    var tl = +spec.cornerTopLeftRadius;
    var tr = +spec.cornerTopRightRadius;
    var br = +spec.cornerBottomRightRadius;
    var bl = +spec.cornerBottomLeftRadius;
    if ([tl,tr,br,bl].some(isNum)){
      node.topLeftRadius     = isNum(tl) ? tl : 0;
      node.topRightRadius    = isNum(tr) ? tr : 0;
      node.bottomRightRadius = isNum(br) ? br : 0;
      node.bottomLeftRadius  = isNum(bl) ? bl : 0;
    }
  }
}
async function applyFills(node, spec){
  var paints = await buildPaints(spec.fills);
  if (paints) node.fills = paints;
}
function applyStrokes(node, spec){
  var strokes = buildStrokes(spec.strokes);
  if (strokes) node.strokes = strokes;
  if (isNum(spec.strokeWeight)) node.strokeWeight = spec.strokeWeight;
  if (spec.strokeAlign) node.strokeAlign = spec.strokeAlign;
  if (Array.isArray(spec.dashPattern)) node.dashPattern = spec.dashPattern.map(function(n){ return +n||0; });
}
function applyEffects(node, spec){
  var effects = buildEffects(spec.effects);
  if (effects) node.effects = effects;
}
function applyConstraints(node, spec){
  if (spec.constraints && isObj(spec.constraints)){
    node.constraints = {
      horizontal: spec.constraints.horizontal || 'MIN',
      vertical: spec.constraints.vertical || 'MIN'
    };
  }
}

// ---- Auto Layout
function applyAutoLayout(frame, spec){
  if (!spec) return;
  if (spec.layoutMode === 'HORIZONTAL' || spec.layoutMode === 'VERTICAL'){
    frame.layoutMode = spec.layoutMode;
    if (isNum(spec.itemSpacing)) frame.itemSpacing = spec.itemSpacing;
    var pad = spec.padding || {};
    if (isNum(pad.t)) frame.paddingTop = pad.t;
    if (isNum(pad.r)) frame.paddingRight = pad.r;
    if (isNum(pad.b)) frame.paddingBottom = pad.b;
    if (isNum(pad.l)) frame.paddingLeft = pad.l;
    if (spec.primaryAxisAlign) frame.primaryAxisAlignItems = spec.primaryAxisAlign;
    if (spec.counterAxisAlign) frame.counterAxisAlignItems = spec.counterAxisAlign;
    if (spec.primaryAxisSizingMode) frame.primaryAxisSizingMode = spec.primaryAxisSizingMode;
    if (spec.counterAxisSizingMode) frame.counterAxisSizingMode = spec.counterAxisSizingMode;
  }
  if (spec.clipsContent === true) frame.clipsContent = true;
  if (spec.layoutGrids) frame.layoutGrids = spec.layoutGrids;
}

// ---- Text
function collectFonts(spec, set){
  if (!spec) return;
  if (spec.type === 'TEXT'){
    var f = spec.fontName || DEFAULT_FONT;
    var fam = (f && f.family) ? f.family : DEFAULT_FONT.family;
    var sty = (f && f.style) ? f.style : DEFAULT_FONT.style;
    set.add(JSON.stringify({family:fam, style:sty}));
  }
  var kids = spec.children;
  if (Array.isArray(kids)){
    for (var i=0;i<kids.length;i++) collectFonts(kids[i], set);
  }
}
async function loadFontsFromSet(set){
  for (var s of set){
    var obj = JSON.parse(s);
    try{
      await figma.loadFontAsync({family: obj.family, style: obj.style});
    }catch(e){
      try { await figma.loadFontAsync({family: obj.family, style: 'Regular'}); }
      catch (ee){ /* ignore */ }
    }
  }
}
function applyTextProps(node, spec){
  var f = spec.fontName || DEFAULT_FONT;
  var fam = (f && f.family) ? f.family : DEFAULT_FONT.family;
  var sty = (f && f.style) ? f.style : DEFAULT_FONT.style;
  node.fontName = { family: fam, style: sty };
  if (isNum(spec.fontSize)) node.fontSize = spec.fontSize;

  if (spec.lineHeight != null){
    if (isNum(spec.lineHeight)) node.lineHeight = { unit:'PIXELS', value: spec.lineHeight };
    else if (isObj(spec.lineHeight)) node.lineHeight = spec.lineHeight;
  }
  if (spec.letterSpacing != null){
    if (isNum(spec.letterSpacing)) node.letterSpacing = { unit:'PERCENT', value: spec.letterSpacing };
    else if (isObj(spec.letterSpacing)) node.letterSpacing = spec.letterSpacing;
  }
  if (spec.textAlignHorizontal) node.textAlignHorizontal = spec.textAlignHorizontal;
  if (spec.textAlignVertical) node.textAlignVertical = spec.textAlignVertical;
  if (typeof spec.characters === 'string') node.characters = spec.characters;

  if (spec.autoResize){
    if (spec.autoResize === 'NONE') node.textAutoResize = 'NONE';
    if (spec.autoResize === 'WIDTH') node.textAutoResize = 'HEIGHT';
    if (spec.autoResize === 'HEIGHT') node.textAutoResize = 'WIDTH';
    if (spec.autoResize === 'BOTH') node.textAutoResize = 'AUTO_HEIGHT';
  }
}

// ---- Node builders
async function buildFrame(spec){
  var n = figma.createFrame();
  applyVisibility(n, spec);
  applySize(n, spec);
  applyPos(n, spec);
  await applyFills(n, spec);
  applyStrokes(n, spec);
  applyCorner(n, spec);
  applyEffects(n, spec);
  applyConstraints(n, spec);
  applyAutoLayout(n, spec);
  return n;
}
async function buildGroup(spec, parent){
  var tempNodes = [];
  if (Array.isArray(spec.children)){
    for (var i=0;i<spec.children.length;i++){
      var node = await createNode(spec.children[i]);
      if (node) {
        (parent || figma.currentPage).appendChild(node);
        tempNodes.push(node);
      }
    }
  }
  if (!tempNodes.length) return null;
  var grp = figma.group(tempNodes, parent || figma.currentPage);
  applyVisibility(grp, spec);
  applyPos(grp, spec);
  return grp;
}
async function buildRect(spec){
  var n = figma.createRectangle();
  applyVisibility(n, spec);
  applySize(n, spec);
  applyPos(n, spec);
  await applyFills(n, spec);
  applyStrokes(n, spec);
  applyCorner(n, spec);
  applyEffects(n, spec);
  applyConstraints(n, spec);
  return n;
}
async function buildEllipse(spec){
  var n = figma.createEllipse();
  applyVisibility(n, spec);
  applySize(n, spec);
  applyPos(n, spec);
  await applyFills(n, spec);
  applyStrokes(n, spec);
  applyEffects(n, spec);
  applyConstraints(n, spec);
  return n;
}
async function buildLine(spec){
  var n = figma.createLine();
  applyVisibility(n, spec);
  await applyStrokes(n, spec);
  applyEffects(n, spec);
  applyConstraints(n, spec);
  applyPos(n, spec);
  if (isNum(spec.strokeWeight)) n.strokeWeight = spec.strokeWeight;
  if (isNum(spec.rotation)) n.rotation = spec.rotation;
  return n;
}
async function buildText(spec){
  var n = figma.createText();
  applyVisibility(n, spec);
  applyPos(n, spec);
  await applyFills(n, spec);
  applyEffects(n, spec);
  applyConstraints(n, spec);
  applyTextProps(n, spec);
  if (isNum(spec.w) && isNum(spec.h)){
    try { n.resize(spec.w, spec.h); } catch(e){}
  }
  return n;
}

async function createNode(spec, parentFrame){
  if (!isObj(spec)) return null;
  var t = (spec.type || 'RECTANGLE').toUpperCase();
  var node = null;

  if (t === 'FRAME') node = await buildFrame(spec);
  else if (t === 'GROUP') node = await buildGroup(spec, parentFrame || figma.currentPage);
  else if (t === 'RECTANGLE') node = await buildRect(spec);
  else if (t === 'ELLIPSE') node = await buildEllipse(spec);
  else if (t === 'LINE') node = await buildLine(spec);
  else if (t === 'TEXT') node = await buildText(spec);
  else node = await buildRect(spec);

  if (node && Array.isArray(spec.children) && t !== 'GROUP'){
    for (var i=0;i<spec.children.length;i++){
      var ch = spec.children[i];
      var childNode = await createNode(ch, node);
      if (childNode){
        node.appendChild(childNode);
        if (spec.layoutMode && ch && ch.absolute){
          childNode.layoutPositioning = 'ABSOLUTE';
          if (isNum(ch.x)) childNode.x = ch.x;
          if (isNum(ch.y)) childNode.y = ch.y;
        }
      }
    }
  }
  return node;
}

function collectAllFonts(root){
  var set = new Set();
  collectFonts(root, set);
  return set;
}
async function importFromJson(data){
  var rootSpec = data && (data.canvas || data);
  if (!isObj(rootSpec)) throw new Error('Invalid JSON root');

  var fontSet = collectAllFonts(rootSpec);
  await loadFontsFromSet(fontSet);

  var node = await createNode(rootSpec);
  if (!node) throw new Error('No node created');

  figma.currentPage.appendChild(node);
  figma.viewport.scrollAndZoomIntoView([node]);
}

// UI 생성
figma.on('run', function () {
  figma.showUI(
    '<style>body{font:12px/1.3 Inter,ui-sans-serif,system-ui;margin:16px;}textarea{width:600px;height:240px;}.row{margin-top:8px;display:flex;gap:8px;align-items:center;}input[type=file]{display:block;}</style>'
    + '<div><b>JSON Import</b></div>'
    + '<textarea id="t" placeholder="Paste JSON here"></textarea>'
    + '<div class="row"><button id="btn">Import</button><input id="file" type="file" accept="application/json,image/*"/></div>'
    + '<script>'
    + 'var $=function(s){return document.querySelector(s)};'
    + 'document.getElementById("btn").onclick=function(){var text=document.getElementById("t").value;parent.postMessage({pluginMessage:{type:"import",text:text}},"*");};'
    + 'document.getElementById("file").onchange=async function(e){var f=e.target.files&&e.target.files[0];if(!f)return;'
    + ' if(f.type==="application/json"){var text=await f.text();document.getElementById("t").value=text;}'
    + ' else if(f.type.indexOf("image/")===0){var b64=await new Promise(function(res){var r=new FileReader();r.onload=function(){res(String(r.result).split(",")[1])};r.readAsDataURL(f);});'
    + ' var json={type:"FRAME",name:f.name,w:390,h:844,fills:[{type:"SOLID",color:{r:1,g:1,b:1}}],children:[{type:"RECTANGLE",name:"bg",w:390,h:844,fills:[{type:"IMAGE",base64:b64,scaleMode:"FILL"}]}]};'
    + ' document.getElementById("t").value=JSON.stringify(json,null,2);}'
    + '};'
    + '<\/script>',
    { width: 660, height: 360 }
  );
});

figma.ui.onmessage = async function (msg){
  if (msg.type !== 'import') return;
  try{
    var raw = msg.text || "{}";
    var data = JSON.parse(raw);
    await importFromJson(data);
    figma.notify('Imported successfully 🎉');
  }catch(e){
    console.error(e);
    figma.notify('Import failed: ' + (e && e.message ? e.message : e));
  }
};
