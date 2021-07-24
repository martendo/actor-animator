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
  });
  img.src = url;
  URL.revokeObjectURL(url);
});

let bgEnabled = false;
const bgEnable = document.getElementById("bgEnable");
bgEnable.addEventListener("input", () => {
  bgEnabled = bgEnable.checked;
  drawObjects();
});
bgEnable.checked = false;

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

let gridEnabled = false;
const gridEnable = document.getElementById("gridEnable");
gridEnable.addEventListener("input", () => {
  gridEnabled = gridEnable.checked;
  drawObjects();
});
gridEnable.checked = false;

let bgX = 0;
const bgXInput = document.getElementById("bgXInput");
bgXInput.addEventListener("input", () => {
  bgX = parseInt(bgXInput.value);
  drawObjects();
});
let bgY = 0;
const bgYInput = document.getElementById("bgYInput");
bgYInput.addEventListener("input", () => {
  bgY = parseInt(bgYInput.value);
  drawObjects();
});

let offset = 0;
const offsetInput = document.getElementById("offsetInput");
offsetInput.addEventListener("input", () => {
  offset = parseInt(offsetInput.value);
  drawObjects();
});
offsetInput.value = 0;

const scaleInput = document.getElementById("scaleInput");
scaleInput.addEventListener("input", () => {
  pixelScale = parseInt(scaleInput.value);
  drawGfx();
  drawObjects();
});
scaleInput.value = pixelScale;

const objectTable = document.getElementById("objectTable");
const objects = [];
let currentObject = null;

const xInput = document.getElementById("xInput");
xInput.addEventListener("input", () => {
  if (currentObject == null) {
    return;
  }
  const object = objects[currentObject];
  object.x = parseInt(xInput.value);
  document.getElementById("object".concat(currentObject)).textContent = objectTextify(object);
  drawObjects();
});
const yInput = document.getElementById("yInput");
yInput.addEventListener("input", () => {
  if (currentObject == null) {
    return;
  }
  const object = objects[currentObject];
  object.y = parseInt(yInput.value);
  document.getElementById("object".concat(currentObject)).textContent = objectTextify(object);
  drawObjects();
});
const tileInput = document.getElementById("tileInput");
tileInput.addEventListener("input", () => {
  if (currentObject == null) {
    return;
  }
  const object = objects[currentObject];
  object.tile = parseInt(tileInput.value);
  document.getElementById("object".concat(currentObject)).textContent = objectTextify(object);
  drawObjects();
});

document.getElementById("addBtn").addEventListener("click", () => {
  objects.push({
    x: 0,
    y: 0,
    tile: 0,
  });
  createObjectTable();
  setCurrentObject(objects.length - 1);
  drawObjects();
});
document.getElementById("removeBtn").addEventListener("click", () => {
  if (currentObject == null) {
    return;
  }
  objects.splice(currentObject, 1);
  createObjectTable();
  let newCurrentObject = null;
  if (currentObject - 1 >= 0) {
    newCurrentObject = currentObject - 1;
  }
  setCurrentObject(newCurrentObject);
  drawObjects();
});

let dragObject = null;
let dragX = 0;
let dragY = 0;
canvas.addEventListener("mousedown", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.x) / pixelScale);
  const y = Math.floor((event.clientY - rect.y) / pixelScale);
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    if (object.x < x && x < object.x + 8 && object.y < y && y < object.y + 16) {
      setCurrentObject(i);
      dragObject = i;
      dragX = x - object.x;
      dragY = y - object.y;
      break;
    }
  }
});
canvas.addEventListener("mouseup", () => {
  dragObject = null;
});
document.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.x) / pixelScale);
  const y = Math.floor((event.clientY - rect.y) / pixelScale);
  if (dragObject == null) {
    return;
  }
  const object = objects[dragObject];
  object.x = x - dragX;
  object.y = y - dragY;
  document.getElementById("object".concat(currentObject)).textContent = objectTextify(object);
  xInput.value = object.x;
  yInput.value = object.y;
  drawObjects();
});

document.getElementById("exportButton").addEventListener("click", () => {
  let result = "";
  for (const object of objects) {
    result += `    DB ${object.y}, ${object.x}, ${hexify(object.tile)}, 0\n`;
  }
  result += "    DB METASPRITE_END\n";
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

function setCurrentObject(num) {
  const oldCurrentObject = document.getElementById("object".concat(currentObject));
  if (oldCurrentObject) {
    oldCurrentObject.classList.remove("current-object");
  }
  currentObject = num;
  if (currentObject == null) {
    return;
  }
  document.getElementById("object".concat(currentObject)).classList.add("current-object");
  const object = objects[num];
  xInput.value = object.x;
  yInput.value = object.y;
  tileInput.value = object.tile + offset;
}

function createObjectTable() {
  while (objectTable.firstChild) {
    objectTable.removeChild(objectTable.firstChild);
  }
  
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    const row = objectTable.insertRow(-1);
    const cell = row.insertCell(0);
    cell.classList.add("object");
    cell.id = "object".concat(i);
    cell.addEventListener("click", () => setCurrentObject(i));
    cell.textContent = objectTextify(object);
  }
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
  
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    const tileId = Math.floor((object.tile - offset) / 2);
    if (tileId < tileCanvases.length && tileId >= 0) {
      ctx.drawImage(
        tileCanvases[tileId],
        object.x * pixelScale, object.y * pixelScale,
        8 * pixelScale, 16 * pixelScale,
      );
    } else {
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(
        object.x * pixelScale, object.y * pixelScale,
        8 * pixelScale, 16 * pixelScale,
      );
    }
    ctx.strokeStyle = "#ff0000";
    if (i == currentObject) {
      ctx.lineWidth = 2;
    } else {
      ctx.lineWidth = 0.5;
    }
    ctx.strokeRect(
      object.x * pixelScale, object.y * pixelScale,
      8 * pixelScale, 16 * pixelScale,
    );
  }
}
