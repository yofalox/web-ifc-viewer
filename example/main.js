import { CameraProjections, IfcViewerAPI } from 'web-ifc-viewer';
import { createSideMenuButton } from './utils/gui-creator';
import {
  IFCSPACE, IFCOPENINGELEMENT, IFCFURNISHINGELEMENT, IFCWALL, IFCWINDOW, IFCCURTAINWALL, IFCMEMBER, IFCPLATE
} from 'web-ifc';
import {
  MeshBasicMaterial,LineBasicMaterial,Color,Vector2,DepthTexture,
  WebGLRenderTarget, Material, BufferGeometry, BufferAttribute, Mesh, Scene
} from 'three';
import { ClippingEdges } from 'web-ifc-viewer/dist/components/display/clipping-planes/clipping-edges';
import Stats from 'stats.js/src/Stats';

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({ container, backgroundColor: new Color(255, 255, 255) });
viewer.axes.setAxes();
viewer.grid.setGrid();

// Get all elements
const table = document.getElementById('info-table');
const body = table.querySelector('tbody');
const ulSelector = document.getElementById('ulItem');
const form = document.getElementById("storeyForm");
document.getElementById("navigation").addEventListener("click",clickEventHandler);

// Set up stats
const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.right = '0px';
stats.dom.style.left = 'auto';
viewer.context.stats = stats;

viewer.context.ifcCamera.cameraControls

const manager = viewer.IFC.loader.ifcManager;

viewer.IFC.setWasmPath('files/');

viewer.IFC.loader.ifcManager.applyWebIfcConfig({
  USE_FAST_BOOLS: true,
  COORDINATE_TO_ORIGIN: true
});

viewer.context.renderer.postProduction.active = true;

let first = true;
let model;
let result;
let missingProp = [];

async function loadIfc() {
  let params = new URL(document.location).searchParams;
  const urlFile =  params.get("url");
  if(!urlFile) return;

  model = await viewer.IFC.loadIfcUrl(urlFile);
  const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
  const listRoot = document.getElementById('myUL');
  createNode(listRoot, ifcProject);
  viewer.shadowDropper.renderShadow(model.modelID);
}
loadIfc();

const scene = viewer.context.getScene();
const inputElement = document.createElement('input');
inputElement.setAttribute('type', 'file');
inputElement.classList.add('hidden');
inputElement.addEventListener('change', loadIfc, false);
viewer.clipper.active = true;

const handleKeyDown = async (event) => {
  
  if(event.code === 'KeyP') {
    viewer.clipper.createPlane();
  }
  else if(event.code === 'KeyO') {
    viewer.clipper.deletePlane();
  }
  if (event.code === 'Escape') {
    viewer.IFC.selector.unHighlightIfcItems();
  }
  if (event.code === 'KeyC') {
    viewer.context.ifcCamera.toggleProjection();
  }
  if (event.code === 'KeyD') {
    viewer.IFC.removeIfcModel(0);
  }
};

window.onmousemove = () => viewer.IFC.selector.prePickIfcItem();
window.onkeydown = handleKeyDown;
window.ondblclick = async () => {
  result = await viewer.IFC.selector.pickIfcItem();
  if (!result) {
    viewer.IFC.selector.unpickIfcItems();
    return;
  }
  const { modelID, id } = result;
  todojunto(modelID,id);
};

async function todojunto(modelID, id){
  const props = await viewer.IFC.getProperties(modelID, id, true, false);
  const propertySets = await viewer.IFC.loader.ifcManager.getPropertySets(modelID, id);

  for(const propertySet of propertySets){
    const realValues = [];

    if(propertySet.HasProperties){
      for(const propriedade of propertySet.HasProperties){
        const id = propriedade.value;
        const value = await viewer.IFC.loader.ifcManager.getItemProperties(modelID, id);
        realValues.push(value);
      }
      propertySet.HasProperties = realValues;
    }

    if(propertySet.Quantities){
      for(const propriedade of propertySet.Quantities){
        const id = propriedade.value;
        const value = await viewer.IFC.loader.ifcManager.getItemProperties(modelID, id);
        realValues.push(value);
        }
      propertySet.Quantities = realValues;
    }
  }
  clearNavBar();
  createNavItem('Identification',id);

  for(const propertySet of propertySets){
    createNavItem(propertySet.Name.value,propertySet.expressID);
  }
  loadTableIdentification(table, props);
}

function createNode(parent, node) {
  if(node.children.length === 0) {
    createLeafNode(parent, node);
  } else {
    // If there are multiple categories, group them together
    // const grouped = groupCategories(node.children);
    createBranchNode(parent, node, node.children);
  }
}

async function createBranchNode(parent, node, children) {

  // container
  const nodeContainer = document.createElement('li');
  parent.appendChild(nodeContainer);

  // title
  const div   = document.createElement('div');
  const title = document.createElement('span');
  const caret = document.createElement('span');
  const props = await viewer.IFC.getProperties(model.modelID, node.expressID, true, false);
  title.textContent = props.Name.value;
  caret.classList.add('caret');
  title.addEventListener("click", function() {
    todojunto(model.modelID,node.expressID);
  });
  caret.addEventListener("click", function() {
      this.parentElement.parentElement.querySelector(".nested").classList.toggle("active");
      this.classList.toggle("caret-down");
    });
  const checkbox   = document.createElement('input');
  checkbox.type    = "checkbox";
  checkbox.checked = true;
  div.appendChild(caret);
  div.appendChild(title);
  div.appendChild(checkbox);
  nodeContainer.appendChild(div);
  checkbox.addEventListener('change', function() {
    let value = this.checked;
    this.parentElement.parentElement.querySelectorAll("input").forEach( function(child){
      child.checked = value;
    });
    viewer.IFC.selector.highlightIfcItemsByID(model.modelID,chequear())
  });

  // children
  const childrenContainer = document.createElement('ul');
  childrenContainer.classList.add('nested');
  nodeContainer.appendChild(childrenContainer);
  children.forEach(child => createNode(childrenContainer, child));
}
function chequear(){
  let ids        = [];
  let checkboxes = document.querySelectorAll("input[type=checkbox]");
  console.log(checkboxes);
  checkboxes.forEach(function(input){
    if(input.id&&input.checked){
      ids.push(parseInt(input.id));
    }
  });
  return ids; 
}
async function createLeafNode(parent, node) {
  const leaf = document.createElement('li');
  leaf.classList.add('leaf-node');
  leaf.id = node.expressID;
  const props = await viewer.IFC.getProperties(model.modelID, node.expressID, true, false);
  leaf.textContent = props.Name.value;
  const checkbox   = document.createElement('input');
  checkbox.type    = "checkbox";
  checkbox.checked = true;
  checkbox.id      = node.expressID;
  checkbox.addEventListener('change', function(event) {
    viewer.IFC.selector.highlightIfcItemsByID(model.modelID,chequear())
  });
  
  leaf.addEventListener('click', () => {
    viewer.IFC.selector.pickIfcItemsByID(model.modelID,[node.expressID],true);
    todojunto(model.modelID,node.expressID)
  });
  leaf.appendChild(checkbox);
  parent.appendChild(leaf);
}

function groupCategories(children) {
  const types = children.map(child => child.type);
  const uniqueTypes = new Set(types);
  if (uniqueTypes.size > 1) {
    const uniquesArray = Array.from(uniqueTypes);
    children = uniquesArray.map(type => {
      return {
        expressID: -1,
        type: type + 'S',
        children: children.filter(child => child.type.includes(type)),
      };
    });
  }
  return children;
}

function clearNavBar(){
  while (ulSelector.firstChild){
    ulSelector.removeChild(ulSelector.firstChild);
  }
}

function createRow(key,value){
  let row = document.createElement('tr');
  body.appendChild(row);
  let propertyName = document.createElement('td');
  propertyName.textContent = decodeIFCString(key);
  row.appendChild(propertyName);

  let propertyValue = document.createElement('td');
  propertyValue.textContent = decodeIFCString(value);
  row.appendChild(propertyValue);
}

function createNavItem(name, id){
  let ulItem = document.createElement('li');
  ulItem.classList.add("nav-item");
  ulSelector.appendChild(ulItem);
  let propertySetName = document.createElement('div');
  propertySetName.classList.add("nav-link");
  propertySetName.textContent = decodeIFCString(name);
  if(name == 'Identification'){
    propertySetName.classList.add("active");
  }
  propertySetName.dataset.elementId = id;
  ulItem.appendChild(propertySetName);
}

function decodeIFCString(ifcString) {
  const ifcUnicodeRegEx = /\\X2\\(.*?)\\X0\\/uig;
  let propString = ifcString;
  let match = ifcUnicodeRegEx.exec(ifcString);
  let unicodeChar;
  while (match) {
      if(match[1].length == 4){
        unicodeChar = String.fromCharCode(parseInt(match[1], 16));
      } else {
        const numCaracteres = match[1].length/4;
        const arrayCaracteres = [];
        let j;

        for(let i=0; i<numCaracteres;i++){
          if(i == 0){
            j=4;
          } else {
            j=4*(i+1);
          }
          arrayCaracteres.push(String.fromCharCode(parseInt(match[1].slice(i*4,j),16)));
        }
        unicodeChar = arrayCaracteres.join("");
      }
      propString = propString.replace(match[0], unicodeChar);
      match = ifcUnicodeRegEx.exec(ifcString);
  }
  return propString;
}
async function loadTableIdentification(table, properties){

  const modelID = model.modelID;
  const id      = properties.expressID;
  clearTable();

  let typeDescription;
  let materialDescription;
  let realValues = [];
  for(const element of properties.type){
    if(element.Name){
      typeDescription = element.Name.value;
    } 
  }
  for(const element of properties.mats){
    if(element.Materials){
      for(const material of element.Materials){
        const id = material.value;
        const value = await viewer.IFC.loader.ifcManager.getItemProperties(modelID, id);
        realValues.push(value);
      }
      element.Materials = realValues;
    } else if(element.Name) {
      materialDescription = element.Name.value;
    }
  }
  for(const element of properties.mats){
    if(element.Materials){
      for(const material of element.Materials){
        if(materialDescription){
          materialDescription = materialDescription + ", " + decodeIFCString(material.Name.value);
        } else{
          materialDescription = decodeIFCString(material.Name.value);
        }
      }
    }
  }

  delete properties.psets;
  delete properties.mats;
  delete properties.type;

  for(let key in properties){
    let value;
    if(decodeIFCString(properties[key] == null || decodeIFCString(properties[key]) === undefined)){
      value = "Unknown";
    } else if(decodeIFCString(properties[key]) && key == 'expressID') {
      value = decodeIFCString(properties[key]);
    } else {
      value = decodeIFCString(properties[key].value);
    }
    createRow(key, value);
  }

  createRow('Material',materialDescription);
  createRow('Type Name', typeDescription);  
}

function clearTable(){
  while (body.firstChild){
    body.removeChild(body.firstChild);
  }
}

async function clickEventHandler(e){
  if(e.target.matches(".nav-link")){
    loadTable(e.target.dataset.elementId);
  }
  let navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach(function(linkEl){
    linkEl.classList.remove("active");
  });
  e.target.classList.add("active");
}

async function loadTable(pset){
  if(pset == 0){
    const modelID = model.modelID;
    const id      = parseInt(pset);
    const props   = await viewer.IFC.getProperties(model.modelID, id, true, false);
    loadTableIdentification(table, props);
  } else{
    const modelID = model.modelID;
    const id      = parseInt(pset);
    const propertySet = await viewer.IFC.loader.ifcManager.getItemProperties(modelID, parseInt(pset));
    const realValues = [];
    const complexValues = [];
    if(propertySet.HasProperties){
      for(const propriedade of propertySet.HasProperties){
        const id = propriedade.value;
        const value = await viewer.IFC.loader.ifcManager.getItemProperties(modelID, id);
        realValues.push(value);
      }
      propertySet.HasProperties = realValues;
    }
    if(propertySet.Quantities){
      for(const propriedade of propertySet.Quantities){
        const id = propriedade.value;
        const value = await viewer.IFC.loader.ifcManager.getItemProperties(modelID, id);
        realValues.push(value);
      propertySet.Quantities = realValues;
     }
    }
    clearTable();
    if(propertySet.HasProperties){
      for(let key of propertySet.HasProperties){
        let value;
        if(key.NominalValue.value == null || key.NominalValue.value === undefined){
          value = "Unknown";
        } else {
          value = key.NominalValue.value;
        }
        createRow(key.Name.value,value);
      }
    }
    if(propertySet.Quantities){
      for(let key of propertySet.Quantities){
        if(key.HasQuantities){
          for(const propComplex of key.HasQuantities){
            const complexId = propComplex.value;
            const complexValue = await viewer.IFC.loader.ifcManager.getItemProperties(modelID, complexId);
            complexValues.push(complexValue);
          }
          key.HasQuantities = complexValues;
        }
        if(key.HasQuantities){
          for(const propComplex of key.HasQuantities){
            let value;
            if(propComplex.LengthValue){
              value = propComplex.LengthValue.value;
            } else if(propComplex.AreaValue){
              value = propComplex.AreaValue.value;
            } else if(propComplex.VolumeValue){
              value = propComplex.VolumeValue.value;
            } else if(propComplex.WeightValue){
              value = propComplex.WeightValue.value;
            } else{
              value = "Unknown";
            }
            createRow(key.Name.value + "." + propComplex.Name.value,value);
          }
        } else {
          let value;
          if(key.LengthValue){
            value = key.LengthValue.value;
          } else if(key.AreaValue){
            value = key.AreaValue.value;
          } else if(key.VolumeValue){
            value = key.VolumeValue.value;
          } else if(key.WeightValue){
            value = key.WeightValue.value;
          } else{
            value = "Unknown";
          }
          createRow(key.Name.value,value);
          }
        }
      }
  }
}