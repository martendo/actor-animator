"use strict";

const SCRN_X = 160;
const SCRN_Y = 144;

let pixelScale = 4;

const canvas = document.getElementById("canvas");
canvas.width = SCRN_X * pixelScale;
canvas.height = SCRN_Y * pixelScale;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const gfxCanvas = document.getElementById("gfxCanvas");
const gfxCtx = gfxCanvas.getContext("2d");
gfxCtx.imageSmoothingEnabled = false;
let gfx = null;
let tileCanvases = [];

const output = document.getElementById("output");

gfxCanvas.addEventListener("mousemove", (event) => {
  const rect = gfxCanvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.x) / pixelScale / 8);
  const y = Math.floor((event.clientY - rect.y) / pixelScale / 16);
  drawGfx();
  gfxCtx.fillStyle = "#ffffff";
  gfxCtx.globalAlpha = 0.85;
  gfxCtx.fillRect(x * 8 * pixelScale, y * 16 * pixelScale, 8 * pixelScale, 16 * pixelScale);
  gfxCtx.fillStyle = "#000000";
  gfxCtx.globalAlpha = 1;
  gfxCtx.font = (pixelScale * 3).toString().concat("px monospace");
  gfxCtx.textAlign = "center";
  const offset = currentMetasprite == null ? 0 : metasprites[currentMetasprite].offset;
  gfxCtx.fillText(
    hexify((y * gfxCanvas.width / pixelScale / 8 * 2 + x * 2 + offset) & 0xFF),
    (x * 8 + 4) * pixelScale, (y * 16 + 8) * pixelScale,
  );
});
gfxCanvas.addEventListener("mouseleave", () => drawGfx());

const input = document.getElementById("imgInput");
input.addEventListener("change", () => {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  output.textContent = "";
  
  if (input.files.length !== 1) {
    return;
  }
  
  const img = document.createElement("img");
  const url = URL.createObjectURL(input.files[0]);
  img.addEventListener("load", () => {
    gfx = dedupGfx(img);
    drawGfx();
    drawObjects();
  });
  img.src = url;
  URL.revokeObjectURL(url);
});
input.value = "";

let bgEnabled = false;
const bgEnable = document.getElementById("bgEnable");
bgEnable.addEventListener("input", () => {
  bgEnabled = bgEnable.checked;
  drawObjects();
});
bgEnable.checked = bgEnabled;

let bg = null;
const bgInput = document.getElementById("bgInput");
bgInput.addEventListener("change", () => {
  if (bgInput.files.length !== 1) {
    return;
  }
  
  const img = document.createElement("img");
  const url = URL.createObjectURL(bgInput.files[0]);
  img.addEventListener("load", () => {
    bg = img;
    bgEnabled = true;
    bgEnable.checked = true;
    drawObjects();
  });
  img.src = url;
  URL.revokeObjectURL(url);
});
bgInput.value = "";

let gridEnabled = false;
const gridEnable = document.getElementById("gridEnable");
gridEnable.addEventListener("input", () => {
  gridEnabled = gridEnable.checked;
  drawObjects();
});
gridEnable.checked = gridEnabled;

let bgX = 0;
const bgXInput = document.getElementById("bgXInput");
bgXInput.addEventListener("input", () => {
  bgX = parseInt(bgXInput.value);
  drawObjects();
});
bgXInput.value = bgX;
let bgY = 0;
const bgYInput = document.getElementById("bgYInput");
bgYInput.addEventListener("input", () => {
  bgY = parseInt(bgYInput.value);
  drawObjects();
});
bgYInput.value = bgY;

const scaleInput = document.getElementById("scaleInput");
scaleInput.addEventListener("input", () => {
  pixelScale = parseInt(scaleInput.value);
  drawGfx();
  drawObjects();
});
scaleInput.value = pixelScale;

let actorX = 0;
const actorXInput = document.getElementById("actorXInput");
actorXInput.addEventListener("input", () => {
  actorX = parseInt(actorXInput.value);
  drawObjects();
});
actorXInput.value = actorX;
let actorY = 0;
const actorYInput = document.getElementById("actorYInput");
actorYInput.addEventListener("input", () => {
  actorY = parseInt(actorYInput.value);
  drawObjects();
});
actorYInput.value = actorY;

const metaspriteTable = document.getElementById("metaspriteTable");
const metasprites = [];
let currentMetasprite = null;

const nameInput = document.getElementById("nameInput");
nameInput.addEventListener("input", () => {
  if (currentMetasprite == null) {
    return;
  }
  metasprites[currentMetasprite].name = nameInput.value;
  createMetaspriteTable();
});
nameInput.value = "";

const offsetInput = document.getElementById("offsetInput");
offsetInput.addEventListener("input", () => {
  if (currentMetasprite == null) {
    return;
  }
  metasprites[currentMetasprite].offset = parseInt(offsetInput.value);
  drawObjects();
});
offsetInput.value = 0;

document.getElementById("addMsBtn").addEventListener("click", () => {
  metasprites.push({
    name: "noname".concat(metasprites.length + 1),
    objects: [],
    offset: 0,
  });
  createMetaspriteTable();
  setCurrentMetasprite(metasprites.length - 1);
  createObjectTable();
  drawObjects();
});
document.getElementById("removeMsBtn").addEventListener("click", () => {
  if (currentMetasprite == null) {
    return;
  }
  metasprites.splice(currentMetasprite, 1);
  let newCurrentMetasprite = null;
  if (currentMetasprite - 1 >= 0) {
    newCurrentMetasprite = currentMetasprite - 1;
  }
  setCurrentMetasprite(newCurrentMetasprite);
  createMetaspriteTable();
  drawObjects();
});

document.getElementById("upMsBtn").addEventListener("click", () => {
  if (currentMetasprite == null) {
    return;
  }
  let newPos = 0;
  if (currentMetasprite - 1 > 0) {
    newPos = currentMetasprite - 1;
  }
  metasprites.splice(newPos, 0, metasprites.splice(currentMetasprite, 1)[0]);
  createMetaspriteTable();
  setCurrentMetasprite(newPos);
});
document.getElementById("downMsBtn").addEventListener("click", () => {
  if (currentMetasprite == null) {
    return;
  }
  let newPos = metasprites.length - 1;
  if (currentMetasprite + 1 < metasprites.length - 1) {
    newPos = currentMetasprite + 1;
  }
  metasprites.splice(newPos, 0, metasprites.splice(currentMetasprite, 1)[0]);
  createMetaspriteTable();
  setCurrentMetasprite(newPos);
});

const objectTable = document.getElementById("objectTable");
let currentObject = null;

const xInput = document.getElementById("xInput");
xInput.addEventListener("input", () => {
  if (currentObject == null) {
    return;
  }
  const object = metasprites[currentMetasprite].objects[currentObject];
  object.x = parseInt(xInput.value);
  document.getElementById("object".concat(currentObject)).textContent = objectTextify(object);
  drawObjects();
});
xInput.value = 0;
const yInput = document.getElementById("yInput");
yInput.addEventListener("input", () => {
  if (currentObject == null) {
    return;
  }
  const object = metasprites[currentMetasprite].objects[currentObject];
  object.y = parseInt(yInput.value);
  document.getElementById("object".concat(currentObject)).textContent = objectTextify(object);
  drawObjects();
});
yInput.value = 0;
const tileInput = document.getElementById("tileInput");
tileInput.addEventListener("input", () => {
  if (currentObject == null) {
    return;
  }
  const object = metasprites[currentMetasprite].objects[currentObject];
  object.tile = parseInt(tileInput.value);
  document.getElementById("object".concat(currentObject)).textContent = objectTextify(object);
  drawObjects();
});
tileInput.value = 0;

document.getElementById("addBtn").addEventListener("click", () => {
  if (currentMetasprite == null) {
    return;
  }
  metasprites[currentMetasprite].objects.push({
    x: 0,
    y: 0,
    tile: 0,
  });
  createObjectTable();
  setCurrentObject(metasprites[currentMetasprite].objects.length - 1);
  drawObjects();
});
document.getElementById("removeBtn").addEventListener("click", () => {
  if (currentMetasprite == null || currentObject == null) {
    return;
  }
  metasprites[currentMetasprite].objects.splice(currentObject, 1);
  let newCurrentObject = null;
  if (currentObject - 1 >= 0) {
    newCurrentObject = currentObject - 1;
  }
  createObjectTable();
  setCurrentObject(newCurrentObject);
  drawObjects();
});

document.getElementById("upBtn").addEventListener("click", () => {
  if (currentMetasprite == null || currentObject == null) {
    return;
  }
  let newPos = 0;
  if (currentObject - 1 > 0) {
    newPos = currentObject - 1;
  }
  const objects = metasprites[currentMetasprite].objects;
  objects.splice(newPos, 0, objects.splice(currentObject, 1)[0]);
  createObjectTable();
  setCurrentObject(newPos);
  drawObjects();
});
document.getElementById("downBtn").addEventListener("click", () => {
  if (currentMetasprite == null || currentObject == null) {
    return;
  }
  const objects = metasprites[currentMetasprite].objects;
  let newPos = objects.length - 1;
  if (currentObject + 1 < objects.length - 1) {
    newPos = currentObject + 1;
  }
  objects.splice(newPos, 0, objects.splice(currentObject, 1)[0]);
  createObjectTable();
  setCurrentObject(newPos);
  drawObjects();
});

let dragObject = null;
let dragX = 0;
let dragY = 0;
canvas.addEventListener("mousedown", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.x) / pixelScale) - actorX;
  const y = Math.floor((event.clientY - rect.y) / pixelScale) - actorY;
  const objects = getObjectsOrdered();
  for (let i = objects.length - 1; i >= 0; i--) {
    const object = objects[i][0];
    const num = objects[i][1];
    if (object.x < x && x < object.x + 8 && object.y < y && y < object.y + 16) {
      setCurrentObject(num);
      drawObjects();
      dragObject = num;
      dragX = x - object.x;
      dragY = y - object.y;
      break;
    }
  }
});
document.addEventListener("mouseup", () => {
  dragObject = null;
});
document.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.x) / pixelScale) - actorX;
  const y = Math.floor((event.clientY - rect.y) / pixelScale) - actorY;
  if (dragObject == null) {
    return;
  }
  const object = metasprites[currentMetasprite].objects[dragObject];
  object.x = x - dragX;
  object.y = y - dragY;
  document.getElementById("object".concat(currentObject)).textContent = objectTextify(object);
  xInput.value = object.x;
  yInput.value = object.y;
  drawObjects();
});

document.getElementById("exportButton").addEventListener("click", () => {
  let result = "";
  for (const metasprite of metasprites) {
    result += "    metasprite .".concat(metasprite.name).concat("\n");
  }
  result += "\n";
  for (const metasprite of metasprites) {
    result += ".".concat(metasprite.name).concat("\n");
    for (let i = 0; i < metasprite.objects.length; i++) {
      const object = metasprite.objects[i];
      if (object.y === -128 || object.y === 128) {
        window.alert(`Object ${i} of meta-sprite "${metasprite.name}" has an invalid Y position of ${object.y} (value is reserved for METASPRITE_END)`);
        return;
      } else if (object.x < -128 || object.x >= 256) {
        window.alert(`Object ${i} of meta-sprite "${metasprite.name}"'s X position is not 8-bit (expected -128 <= ${object.x} < 256)`);
        return;
      } else if (object.y < -128 || object.y >= 256) {
        window.alert(`Object ${i} of meta-sprite "${metasprite.name}"'s Y position is not 8-bit (expected -128 <= ${object.y} < 256)`);
        return;
      } else if (object.tile < -128 || object.tile >= 256) {
        window.alert(`Object ${i} of meta-sprite "${metasprite.name}"'s tile number is not 8-bit (expected -128 <= ${object.y} < 256)`);
        return;
      }
      result += `    DB ${object.y}, ${object.x}, ${hexify(object.tile)}, 0\n`;
    }
    result += "    DB METASPRITE_END\n";
  }
  output.textContent = result;
});

function hexify(num) {
  return "$".concat(num.toString(16).padStart(2, "0").toUpperCase());
}

function objectTextify(object) {
  return `${object.y}, ${object.x}, ${hexify(object.tile)}`;
}

function dedupGfx(img) {
  const imgCanvas = document.createElement("canvas");
  imgCanvas.width = img.width;
  imgCanvas.height = img.height;
  const imgCtx = imgCanvas.getContext("2d");
  imgCtx.drawImage(img, 0, 0);
  
  const tiles = [];
  for (let y = 0; y < img.height / 16; y++) {
    nextTile:
    for (let x = 0; x < img.width / 8; x++) {
      const tile = imgCtx.getImageData(x * 8, y * 16, 8, 16);
      const tileData = tile.data;
      if (tiles.length) {
        duplicateCheck:
        for (const existingTile of tiles) {
          const existingTileData = existingTile.data;
          for (let i = 0; i < tileData.length; i++) {
            if (tileData[i] !== existingTileData[i]) {
              // Different from this tile -> check with next
              continue duplicateCheck;
            }
          }
          // Duplicate tile
          continue nextTile;
        }
      }
      tiles.push(tile);
    }
  }
  
  const newImg = document.createElement("canvas");
  newImg.width = 16 * 8;
  newImg.height = Math.ceil(tiles.length / 16) * 16;
  const newCtx = newImg.getContext("2d");
  newCtx.fillStyle = "#ff00ff";
  newCtx.fillRect(0, 0, newImg.width, newImg.height);
  let x = 0;
  let y = 0;
  tileCanvases = [];
  for (const tile of tiles) {
    newCtx.putImageData(tile, x * 8, y * 16);
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = 8;
    tileCanvas.height = 16;
    tileCanvas.getContext("2d").putImageData(tile, 0, 0);
    tileCanvases.push(tileCanvas);
    
    if (++x >= 16) {
      x = 0;
      y++;
    }
  }
  return newImg;
}

function drawGfx() {
  if (!gfx) {
    return false;
  }
  gfxCanvas.width = gfx.width * pixelScale;
  gfxCanvas.height = gfx.height * pixelScale;
  gfxCtx.imageSmoothingEnabled = false;
  gfxCtx.drawImage(gfx, 0, 0, gfxCanvas.width, gfxCanvas.height);
  for (let y = 0; y < gfx.height / 16; y++) {
    for (let x = 0; x < gfx.width / 8; x++) {
      gfxCtx.strokeStyle = "#000000";
      gfxCtx.lineWidth = 1;
      gfxCtx.globalAlpha = 0.5;
      gfxCtx.strokeRect(x * 8 * pixelScale, y * 16 * pixelScale, 8 * pixelScale, 16 * pixelScale);
      gfxCtx.globalAlpha = 1;
    }
  }
}

function setCurrentMetasprite(num) {
  const oldCurrentMetasprite = document.getElementById("metasprite".concat(currentMetasprite));
  if (oldCurrentMetasprite) {
    oldCurrentMetasprite.classList.remove("currentMetasprite");
  }
  currentMetasprite = num;
  currentObject = null;
  if (currentMetasprite == null) {
    return;
  }
  document.getElementById("metasprite".concat(currentMetasprite)).classList.add("currentMetasprite");
  nameInput.value = metasprites[currentMetasprite].name;
  offsetInput.value = metasprites[currentMetasprite].offset;
}

function createMetaspriteTable() {
  while (metaspriteTable.firstChild) {
    metaspriteTable.removeChild(metaspriteTable.firstChild);
  }
  
  for (let i = 0; i < metasprites.length; i++) {
    const row = metaspriteTable.insertRow(-1);
    const cell = row.insertCell(0);
    cell.classList.add("metasprite");
    cell.id = "metasprite".concat(i);
    cell.addEventListener("click", () => {
      setCurrentMetasprite(i);
      createObjectTable();
      drawObjects();
    });
    cell.textContent = metasprites[i].name;
  }
  if (currentMetasprite != null) {
    document.getElementById("metasprite".concat(currentMetasprite)).classList.add("currentMetasprite");
  }
  createObjectTable();
}

function setCurrentObject(num) {
  const oldCurrentObject = document.getElementById("object".concat(currentObject));
  if (oldCurrentObject) {
    oldCurrentObject.classList.remove("currentObject");
  }
  currentObject = num;
  if (currentObject == null) {
    return;
  }
  document.getElementById("object".concat(currentObject)).classList.add("currentObject");
  const metasprite = metasprites[currentMetasprite];
  const object = metasprite.objects[num];
  xInput.value = object.x;
  yInput.value = object.y;
  tileInput.value = object.tile + metasprite.offset;
}

function createObjectTable() {
  while (objectTable.firstChild) {
    objectTable.removeChild(objectTable.firstChild);
  }
  
  if (currentMetasprite == null) {
    return;
  }
  
  for (let i = 0; i < metasprites[currentMetasprite].objects.length; i++) {
    const object = metasprites[currentMetasprite].objects[i];
    const row = objectTable.insertRow(-1);
    const cell = row.insertCell(0);
    cell.classList.add("object");
    cell.id = "object".concat(i);
    cell.addEventListener("click", () => setCurrentObject(i));
    cell.textContent = objectTextify(object);
  }
  if (currentObject != null) {
    document.getElementById("object".concat(currentObject)).classList.add("currentObject");
  }
}

function getObjectsOrdered() {
  return metasprites[currentMetasprite].objects.slice()
    .map((object, i) => [object, i])
    .sort((a, b) => a[0].x - b[0].x);
}

function drawObjects() {
  canvas.width = SCRN_X * pixelScale;
  canvas.height = SCRN_Y * pixelScale;
  ctx.imageSmoothingEnabled = false;
  
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (bg && bgEnabled) {
    ctx.drawImage(bg, bgX * pixelScale, bgY * pixelScale, bg.width * pixelScale, bg.height * pixelScale);
  }
  if (gridEnabled) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 0.5;
    for (let y = 0; y < canvas.height / pixelScale / 8; y++) {
      for (let x = 0; x < canvas.width / pixelScale / 8; x++) {
        ctx.strokeRect(
          (x * 8 + bgX) * pixelScale,
          (y * 8 + bgY) * pixelScale,
          8 * pixelScale, 8 * pixelScale,
        );
      }
    }
  }
  
  if (currentMetasprite == null) {
    return;
  }
  
  const objects = getObjectsOrdered();
  const offset = metasprites[currentMetasprite].offset;
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i][0];
    const tileId = Math.floor((object.tile - offset) / 2);
    if (tileId < tileCanvases.length && tileId >= 0) {
      ctx.drawImage(
        tileCanvases[tileId],
        (object.x + actorX) * pixelScale,
        (object.y + actorY) * pixelScale,
        8 * pixelScale, 16 * pixelScale,
      );
    } else {
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(
        (object.x + actorX) * pixelScale,
        (object.y + actorY) * pixelScale,
        8 * pixelScale, 16 * pixelScale,
      );
    }
    ctx.strokeStyle = "#ff0000";
    if (objects[i][1] == currentObject) {
      ctx.lineWidth = 2;
    } else {
      ctx.lineWidth = 0.5;
    }
    ctx.strokeRect(
      (object.x + actorX) * pixelScale,
      (object.y + actorY) * pixelScale,
      8 * pixelScale, 16 * pixelScale,
    );
  }
  
  ctx.strokeStyle = "#ff8000";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.moveTo(actorX * pixelScale, 0);
  ctx.lineTo(actorX * pixelScale, canvas.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, actorY * pixelScale);
  ctx.lineTo(canvas.width, actorY * pixelScale);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#0000ff";
  ctx.fillRect(actorX * pixelScale - 2, actorY * pixelScale - 2, 3, 3);
}
