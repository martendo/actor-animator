"use strict";

const PIXEL_SCALE = 6;

const canvas = document.getElementById("canvas");
canvas.width = 64 * PIXEL_SCALE;
canvas.height = 64 * PIXEL_SCALE;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const gfxCanvas = document.getElementById("gfxCanvas");
const gfxCtx = gfxCanvas.getContext("2d");
gfxCtx.imageSmoothingEnabled = false;
let gfx = null;
let tileCanvases = [];

const output = document.getElementById("output");

gfxCanvas.addEventListener("mousemove", (event) => {
  const x = Math.floor((event.clientX - gfxCanvas.offsetLeft) / PIXEL_SCALE / 8);
  const y = Math.floor((event.clientY - gfxCanvas.offsetTop) / PIXEL_SCALE / 16);
  drawGfx();
  gfxCtx.fillStyle = "#ffffff";
  gfxCtx.globalAlpha = 0.85;
  gfxCtx.fillRect(x * 8 * PIXEL_SCALE, y * 16 * PIXEL_SCALE, 8 * PIXEL_SCALE, 16 * PIXEL_SCALE);
  gfxCtx.fillStyle = "#000000";
  gfxCtx.globalAlpha = 1;
  gfxCtx.font = "20px monospace";
  gfxCtx.textAlign = "center";
  gfxCtx.fillText(
    hexify((y * gfxCanvas.width / PIXEL_SCALE / 8 * 2 + x * 2 + offset) & 0xFF),
    (x * 8 + 4) * PIXEL_SCALE, (y * 16 + 8) * PIXEL_SCALE,
  );
});
gfxCanvas.addEventListener("mouseleave", () => drawGfx());

const input = document.getElementById("imgInput");
input.addEventListener("change", () => {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  output.textContent = "";
  
  console.log(input.files);
  
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

let offset = 0;
const offsetInput = document.getElementById("offsetInput");
offsetInput.addEventListener("input", () => {
  offset = parseInt(offsetInput.value);
  drawObjects();
});
offsetInput.value = 0;

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

document.getElementById("exportButton").addEventListener("click", () => {
  let result = "";
  for (const object of objects) {
    result += `    DB ${object.y}, ${object.x}, ${hexify(object.tile)}, 0\n`;
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
  gfxCanvas.width = gfx.width * PIXEL_SCALE;
  gfxCanvas.height = gfx.height * PIXEL_SCALE;
  gfxCtx.imageSmoothingEnabled = false;
  gfxCtx.drawImage(gfx, 0, 0, gfxCanvas.width, gfxCanvas.height);
  for (let y = 0; y < gfx.height / 16; y++) {
    for (let x = 0; x < gfx.width / 8; x++) {
      gfxCtx.strokeStyle = "#000000";
      gfxCtx.lineWidth = 1;
      gfxCtx.globalAlpha = 0.5;
      gfxCtx.strokeRect(x * 8 * PIXEL_SCALE, y * 16 * PIXEL_SCALE, 8 * PIXEL_SCALE, 16 * PIXEL_SCALE);
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
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    const tileId = Math.floor((object.tile - offset) / 2);
    if (tileId < tileCanvases.length && tileId >= 0) {
      ctx.drawImage(
        tileCanvases[tileId],
        object.x * PIXEL_SCALE, object.y * PIXEL_SCALE,
        8 * PIXEL_SCALE, 16 * PIXEL_SCALE,
      );
    } else {
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(
        object.x * PIXEL_SCALE, object.y * PIXEL_SCALE,
        8 * PIXEL_SCALE, 16 * PIXEL_SCALE,
      );
    }
    ctx.strokeStyle = "#000000";
    if (i == currentObject) {
      ctx.lineWidth = 3;
    } else {
      ctx.lineWidth = 1;
    }
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(
      object.x * PIXEL_SCALE, object.y * PIXEL_SCALE,
      8 * PIXEL_SCALE, 16 * PIXEL_SCALE,
    );
    ctx.globalAlpha = 1;
  }
}
