import * as THREE from "./dist/three.module.js";
import { EffectComposer } from './dist/EffectComposer.js';
import { RenderPass } from './dist/RenderPass.js';
import { UnrealBloomPass } from './dist/UnrealBloomPass.js';
import { Lensflare, LensflareElement } from './dist/LensFlare.js';
import {OrbitControls} from "./dist/OrbitControls.js";

var Scene, Camera, Renderer, Composer, Clock, Controls;
var RAD = Math.PI/180;
var DEG = 180/Math.PI;

var loadManager;
var PlanetObjects = [];
var NorthPoleVectors = [];
var Orbits = [];
var Labels = [];
var SaturnRings;
var SunFlare;
var SunObj;
var CurrentTimeJDN;
var TimeMultiplier = 1;
var InAccelTime = false;
var InOverview = false;
var Locked = false;
var CurrentTarget;
var Init = true;

var lightPos = new THREE.Vector3(0, 0, 0);
var lightCol = new THREE.Color(0xfff2ed);
var lightI = 100;
var specI = 0.0;
var ambient = 0.01;
var shininess = 1.3;

const params = {
  exposure: 0.0073,
  bloomStrength: 0.195,
  bloomThreshold: 0,
  bloomRadius: 2.03,
  normalStrength: 1.6
};

// Ephemeris from https://ssd.jpl.nasa.gov/horizons
// J2000 Julian Date -> 2451545.0
// D0 = 2021-Aug-01 00:00:00 for these ephemeris
// and its Julian Date Number is:
var D0 = 2459427.5;
var Planets = [{
  name: "mercury",
  obP: {  EC: 0.2056300688203926,    // eccentricity e
          IN: 7.003660025940505,     // inclination i
          A: 0.3870981083367395,     // semi major axis a
          M0: 32.62385316739722,     // mean anomaly M
          W: 29.18672594563536,      // argument of periphileon w
          OM: 48.30381657879919,     // long. asc. node omega
          N: 4.092347800298432},     // mean motion n
  northP: new THREE.Vector3(-0.08169670885729537,0.9924581847421388,0.09139146185626497), // north pole unit vector
  radius: 0.0000163137349,           // planet radius
  rotatRate: 0.00000124001303010,    // axis rotation speed in radians/s
  orbCol: 0xa6a6a6,
  normalSt: 1.0,
  tex: "resources/images/mercury.jpg",
  texN: "resources/images/mercury-normal.png"},
  {
  name: "venus",
  obP: {  EC: 0.006787777922031962,   
          IN: 3.394506860880322,  
          A: 0.7233249923835424,      
          M0: 79.01684373155737,     
          W: 55.13664449508403,      
          OM: 76.62176269058247,     
          N: 1.602154517711833},
  northP: new THREE.Vector3(0.017449748351250544,-0.9993908270190958,0.030223850723657183),
  radius: 0.000040453784,
  rotatRate: 0.000000299239873848,
  orbCol: 0xccba7e,
  normalSt: 0.0,
  tex: "resources/images/venus.jpg",
  texN: ""},
  {
  name: "earth",
  obP: {  EC: 0.01649024510885232,   
          IN: 0.004238758902791069,  
          A: 1.000064306242417,      
          M0: 205.4970885794178,     
          W: 305.9960339970245,      
          OM: 157.9917231982184,     
          N: 0.9855140851393105},
  northP: new THREE.Vector3(0.39777518454257826,0.9174829167685455,0),
  radius: 0.0000426352,
  rotatRate: 0.0000729211585454431,
  orbCol: 0x448894,
  normalSt: 1.4,
  tex: "resources/images/earth.jpg",
  texN: "resources/images/earth-specular.png"},
  {
  name: "moon",
  obP: {  EC: 0.06452888410987892,   
          IN: 5.111793910426131,  
          A: 0.002539988683423325,      
          M0: 161.1019509557081,     
          W: 171.5294118084369,      
          OM: 68.61748240702610,     
          N: 13.42530296546681},
  northP: new THREE.Vector3(-0.0003635869817646448,0.9999999339022512,0),
  radius: 0.0000116138017,
  rotatRate: 0.0000026616995272150697,
  orbCol: 0x6b7b8c,
  normalSt: 0.3,
  tex: "resources/images/moon.jpg",
  texN: "resources/images/moon-normal.jpg"},
  {
  name: "mars",
  obP: {  EC: 0.09334122873880951,
          IN: 1.847898052281242,
          A: 1.523727741103164,
          M0: 189.9426949443219,
          W: 286.6961645560187,
          OM: 49.49135059204495,
          N: 0.5240142319407533},
  northP: new THREE.Vector3(-0.05547898385302705,0.8932556485804318,0.446112573942708),
  radius: 0.000022702195,
  rotatRate: 0.00007292115,
  orbCol: 0xa65837,
  normalSt: 1.8,
  tex: "resources/images/mars.jpg",
  texN: "resources/images/mars-normal.png"},
  {
  name: "jupiter",
  obP: {  EC: 0.04871940433448074,
          IN: 1.303316117865421,
          A: 5.204836267459862,
          M0: 315.5933934123568,
          W: 273.2263739003975,
          OM: 100.505732709447,
          N: 0.08304254573317077},
  northP: new THREE.Vector3(-0.03590615289334038,0.9992477137401423,-0.01465451362205603),
  radius: 0.000477894503,
  rotatRate: 0.00017734058128229422,
  orbCol: 0x8a7c62,
  normalSt: 0.0,
  tex: "resources/images/jupiter.jpg",
  texN: ""},
  {
  name: "saturn",
  obP: {  EC: 0.05233842183153426,
          IN: 2.486612539269342,
          A: 9.580240192958486,
          M0: 224.4622373003027,
          W: 335.8100353284937,
          OM: 113.5975252058448,
          N: 0.03324310125318371},
  northP: new THREE.Vector3(0.4624261111012926,0.8825330678596439,0.08542526503312815),
  radius: 0.000402866697,
  rotatRate: 0.00017054890282933958,
  orbCol: 0x99a37c,
  normalSt: 0.0,
  tex: "resources/images/saturn.jpg",
  texR: "resources/images/saturn-rings.png",
  texN: ""},
  {
  name: "uranus",
  obP: {  EC: 0.04440896208524951,
          IN: 0.7702312664730875,
          A: 19.23388689073648, 
          M0: 235.3836882414614,
          W: 95.98446947021125,
          OM: 74.10091986198319,
          N: 0.01168457625725100},
  northP: new THREE.Vector3(0.9679684004416559,-0.13433209564170154,0.21211332779184608),
  radius: 0.000170851362,
  rotatRate: 0.00010123766537166816,
  orbCol: 0x5eadac,
  normalSt: 0.0,
  tex: "resources/images/uranus.jpg",
  texN: ""},
  {
  name: "neptune",
  obP: {  EC: 0.01346935356353255,   
          IN: 1.763316934993818,
          A: 30.29012621800903,     
          M0: 334.4185352621221,
          W: 245.8921899660317,
          OM: 131.5928764411730,
          N: 0.005912397610725798},
  northP: new THREE.Vector3(-0.30781771841586425,0.8819092026544161,0.35704959109723644),
  radius: 0.000165537115,
  rotatRate: 0.00010833825276190749,
  orbCol: 0x30509c,
  normalSt: 0.0,
  tex: "resources/images/neptune.jpg",
  texN: ""
}]

// normalize angles to positive [0,360]:
function normalizeAngle(degrees) {
  if (degrees >= 0) {
    return degrees % 360
  } else {
    return degrees % -360 + 360
  }
}

// normalize angles to positive [0,2*PI]:
function normalizeAngleRad(radians) {
  if (radians >= 0) {
    return radians % (2*Math.PI)
  } else {
    return (radians % (-2*Math.PI)) + 2*Math.PI
  }
}

function trueAnomaly(ec, m) {
  var l = m * (Math.PI/180);
  var u = l
  var i = 0;
  do {
    var ut = u;
    var delta_u = (l - u + (ec * Math.sin(u))) / (1 - (ec * Math.cos(u)));
    u = u + delta_u;
    if (i > 1000000) { break; }
    i++
  } while (Math.abs(ut - u) > 0.0000001);
  var eccentric_anomaly = u;
  var ta = 2 * Math.atan(Math.sqrt((1 + ec) / (1 - ec)) * Math.tan(eccentric_anomaly / 2));
  return normalizeAngle(DEG*ta);
}

function posInOrbit(ob, M) {
  let ta = trueAnomaly(ob.EC,M)*RAD;
  let om  = ob.OM *RAD;
  let w   = ob.W  *RAD;
  let inc = ob.IN *RAD;
  let r = Math.abs(ob.A*(1-ob.EC**2)) / (1+ob.EC*Math.cos(ta));
  let planetX = r*(Math.cos(om)*Math.cos(w+ta) - Math.sin(om)*Math.cos(inc)*Math.sin(w+ta));
  let planetY = r*(Math.sin(om)*Math.cos(w+ta) + Math.cos(om)*Math.cos(inc)*Math.sin(w+ta));
  let planetZ = r*Math.sin(inc)*Math.sin(w+ta);
  return new THREE.Vector3(planetY, planetZ, planetX)
}

function createOrbit(ob) {
  let matparams = { color: ob.orbCol, toneMapped: false, opacity: 0.5, transparent: true};
  const orbitmat = new THREE.LineBasicMaterial(matparams);
  const points = [];
  let offset = 0;
  do {
    let pos = posInOrbit(ob.obP, ob.obP.M0 + offset);
    points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
    offset = offset + 0.5;
  } while(offset <= 360);
  const orbitgeo = new THREE.BufferGeometry().setFromPoints( points );
  const orbit = new THREE.Line( orbitgeo, orbitmat );
  Scene.add(orbit);
  Orbits.push({name: ob.name, object: orbit});
}

function goToPlanet(name) {
  let r = Planets.find(x=> x.name == name).radius;
  let planet = PlanetObjects.find(x=> x.name == name);
  if (planet) {
    let offset = r*1.8;
    let minDistance = r*1.4;
    let planetpos = planet.object.position;
    Camera.position.set(planetpos.x+offset, planetpos.y+offset, planetpos.z+offset);
    Controls.target.set(planetpos.x, planetpos.y, planetpos.z);
    Controls.minDistance = minDistance;
    Controls.maxDistance = 50;
    //if (InAccelTime) {Controls.maxDistance=0.0003;}
    Controls.update();
    CurrentTarget = name;
    InOverview = false;
  }
}

function removeObject(object) {
  if (!(object instanceof THREE.Object3D)) return false;
  if (object.geometry) { object.geometry.dispose(); }
  if (object.material instanceof Array){ 
    object.material.forEach(material => material.dispose());
  } else {  object.material.dispose();  }
  if (object.parent) { object.parent.remove(object);  }
  return true;
}

function latLongToVector(ra, dec) {
  let RA = ra*RAD;
  let DEC = dec*RAD;
  let px = Math.cos(DEC)*Math.cos(RA);
  let py = Math.cos(DEC)*Math.sin(RA);
  let pz = Math.sin(DEC);
  let dir = new THREE.Vector3(py,pz,px);
  dir = dir.normalize();
  return dir
}

// Julian day from UTC date
function UTCtoJDN(jd) {
  var y =  jd.getUTCFullYear();  //year
  var m =  jd.getUTCMonth()+1;   //month
  var d =  jd.getUTCDate();      //day
  var uh = jd.getUTCHours();     //hour
  var um = jd.getUTCMinutes();   //minute
  var us = jd.getUTCSeconds();   //second

  var extra = 100.0 * y + m - 190002.5
  var rjd = 367.0 * y
  rjd -= Math.floor(7.0 * (y + Math.floor((m + 9.0) / 12.0)) / 4.0)
  rjd += Math.floor(275.0 * m / 9.0)
  rjd += d
  rjd += (uh + (um + us / 60.0) / 60.) / 24.0
  rjd += 1721013.5
  rjd -= 0.5 * extra / Math.abs(extra)
  rjd += 0.5
  return rjd
}

// UTC date from Julian day
function JDNtoUTC(julian) {
  var jd = julian;
  var jd0 = jd + 0.5
  var z = Math.floor(jd0)
  var f = jd0 - z
  var a = 0.0
  var alp = 0.0
  if (z < 2299161) {
      a = z
  } else {
      alp = Math.floor((z - 1867216.25) / 36524.25)
      a = z + 1.0 + alp - Math.floor(alp / 4.0)
  }
  var b = a + 1524
  var c = Math.floor((b - 122.1) / 365.25)
  var d = Math.floor(365.25 * c)
  var e = Math.floor((b - d) / 30.6001)
  var dayt = b - d - Math.floor(30.6001 * e) + f
  var mon = 0
  if (e < 13.5) {
      mon = e - 1
  } else {
      mon = e - 13
  }
  var yr = 0
  if (mon > 2.5) {
      yr = c - 4716
  } else {
      yr = c - 4715
  }
  var utht = Math.floor(24.0 * (dayt - Math.floor(dayt)))
  var utmt = Math.floor(1440.0 * (dayt - Math.floor(dayt) - utht / 24.0))
  var utst = 86400.0 * (dayt - Math.floor(dayt) - utht / 24.0 - utmt / 1440.0)
  return  new Date(yr,mon-1,Math.floor(dayt),utht,utmt,utst)
}

function createNorthPoleVector(name, planetPos, northP, length) {
  let finalPos = planetPos.clone();
  northP = northP.multiplyScalar(length);
  finalPos = finalPos.add(northP);
  let vector = new THREE.Vector3(finalPos.x-planetPos.x,finalPos.y-planetPos.y,finalPos.z-planetPos.z);
  let vecgeo = new THREE.BufferGeometry().setFromPoints( [new THREE.Vector3(0,0,0),vector] );
  let vec = new THREE.Line( vecgeo, new THREE.LineBasicMaterial({toneMapped: false}) );
  vec.visible = false;
  vec.position.set(planetPos.x,planetPos.y,planetPos.z);
  Scene.add(vec);
  NorthPoleVectors.push({name: name, object: vec, length: length});
}

function updateNorthPoleVectors() {
  for (const p of PlanetObjects) {
    let np = NorthPoleVectors.find(x=> x.name == p.name);
    np.object.position.set(p.object.position.x,p.object.position.y,p.object.position.z);
  }
}

function createLabels() {
  for (const planet of PlanetObjects) {
    if(planet.name == 'moon') {continue}
    let name = planet.name;
    let p = planet.object.position;
    const map = new THREE.TextureLoader(loadManager).load('resources/images/label-'+name+'.png',()=>{
      var spriteMaterial = new THREE.SpriteMaterial({ map: map, sizeAttenuation: false, color: 0xffffff});
      spriteMaterial.opacity = 0.8;
      var sprite = new THREE.Sprite( spriteMaterial );
      let aspect = map.image.naturalWidth/map.image.naturalHeight;
      let heightS = 0.015;
      sprite.scale.set( heightS*aspect, heightS, 0.001);
      sprite.position.set(p.x,p.y+0.002,p.z);
      Scene.add( sprite );
      Labels.push({name: name, sprite: sprite});
    });
  }
}

function updateLabels() {
  for (const planet of PlanetObjects) {
    if(planet.name == 'moon') {continue}
    let name = planet.name;
    let p = planet.object.position;
    let label = Labels.find(x=> x.name == name);
    // calculate label pos closer to screen to prevent z-fighting
    // calc vector to camera and move along vector
    let newp = new THREE.Vector3(p.x,p.y+0.002,p.z);
    let l = new THREE.Vector3(Camera.position.x-newp.x,Camera.position.y-newp.y,Camera.position.z-newp.z);
    l.multiplyScalar(0.8);
    label.sprite.position.set(newp.x+l.x,newp.y+l.y,newp.z+l.z);
  }
}

function createPlanetMat(planet) {
  let useNormal = 1.0;
  let textureN;
  let vertex = 'phong-vertex'; let fragment = 'phong-fragment';
  let loader = new THREE.TextureLoader(loadManager);
  let texture = loader.load(planet.tex);
  texture.anisotropy = 16;
  if (planet.texN == "") {
    textureN = texture; useNormal = 0.0;
  } else { textureN = loader.load(planet.texN); }
  if (planet.name == 'saturn') {
    textureN = loader.load('resources/images/saturn-rings.png');
    vertex = 'saturn-vertex'; fragment = 'saturn-fragment';
  }
  var uniforms = {
    lightPos:  {value: lightPos},
    lightCol:  {value: lightCol},
    lightI:    {value: lightI},
    specI:     {value: specI},
    shininess: {value: shininess},
    ambient:   {value: ambient},
    exposure:  {value: params.exposure},
    useNormal: {value: useNormal},
    normalStrength: {value: planet.normalSt},
    tex:       {value: texture},
    texNormal: {value: textureN}
  }
  var planetMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById(vertex).textContent,
    fragmentShader: document.getElementById(fragment).textContent
  });
  return planetMat
}

function createEarthMath(planet) {
  let loader = new THREE.TextureLoader(loadManager);
  let texture = loader.load(planet.tex);
  let textureN = loader.load(planet.texN);
  texture.anisotropy = 16;
  textureN.anisotropy = 16;
  var uniforms = {
    lightPos:  {value: lightPos},
    lightCol:  {value: lightCol},
    lightI:    {value: lightI},
    specI:     {value: 14},
    shininess: {value: 13.3},
    ambient:   {value: ambient},
    exposure:  {value: 0.0103},
    useNormal: {value: 0.0},
    normalStrength: {value: 0.0},
    tex:       {value: texture},
    texNormal: {value: textureN}
  }
  var planetMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('earth-vertex').textContent,
    fragmentShader: document.getElementById('earth-fragment').textContent
  });
  return planetMat
}

function updateClock() {
  let d = JDNtoUTC(CurrentTimeJDN);
  let now = d.toLocaleDateString('en-US', {month: 'long',day: 'numeric', year: 'numeric'});
  document.getElementById('date-text').innerHTML = now;
  let time = ('0' + (d.getHours())).slice(-2)+':'+('0' + (d.getMinutes())).slice(-2)+':'+
             ('0' + (d.getSeconds())).slice(-2);
  document.getElementById('time-display').innerHTML = time;
}

function isAccelTime() {
  if (TimeMultiplier >= 100000) {
    InAccelTime = true;
  } else if (TimeMultiplier < 100000) {
    InAccelTime = false;
  }
}



/*************************************** MAIN ***************************************/
function main() {
  Camera = new THREE.PerspectiveCamera(
    60,         // fov
    window.innerWidth / window.innerHeight, //aspect
    0.000004,   // near clipping
    9010        // far clipping
    );
  /************************** Renderer **************************/
  Renderer = new THREE.WebGLRenderer({ antialias: true });
  // Renderer.toneMapping = THREE.ACESFilmicToneMapping;
  Renderer.setSize(window.innerWidth, window.innerHeight);
  Renderer.domElement.id = "canvas";
  document.body.appendChild(Renderer.domElement);

  Controls = new OrbitControls(Camera, Renderer.domElement);
  Controls.minDistance = 0.000021;
  Controls.maxDistance = 50;
  Camera.position.set(1,1,1);

  loadManager = new THREE.LoadingManager();
  Clock = new THREE.Clock();
  Scene = new THREE.Scene();

  const renderScene = new RenderPass( Scene, Camera );
  const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 0.22, 2.03, 0 );
  bloomPass.threshold = params.bloomThreshold;
  bloomPass.strength = params.bloomStrength;
  bloomPass.radius = params.bloomRadius;
  Composer = new EffectComposer( Renderer );
  Composer.addPass( renderScene );
  Composer.addPass( bloomPass );

  /************************** Skydome **************************/
  let skyloader = new THREE.TextureLoader(loadManager);
  var texture = skyloader.load(
    'resources/images/milkyWay.jpg',
    () => {
      const skyDome = new THREE.SphereGeometry(9000, 64, 64);
      texture.anisotropy = 8;
      let uniforms = {sky: {value: texture}}
      const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById('skydome-vertex').textContent,
        fragmentShader: document.getElementById('skydome-fragment').textContent
      });
      const sky = new THREE.Mesh(skyDome, material);
      sky.material.side = THREE.BackSide;
      // We rotate the milky way sky so that it's correct in the ecliptic
      // coordinate system we are using and is accurate to real life
      sky.rotateY(Math.PI/2);
      sky.rotateX(-0.4090928040274); // obliquity of ecliptic in radians
      Scene.add(sky);
  });

  /************************** Sun Light **************************/

  SunFlare = new THREE.PointLight(lightCol, lightI, 0, 0);
  SunFlare.position.set(0,0,0);

  let sunloader = new THREE.TextureLoader(loadManager);
  let texture0 = sunloader.load("resources/images/lensflare0.png");
  let lensflare = new Lensflare();
  lensflare.addElement(new LensflareElement(texture0, 200, 0));
  SunFlare.add(lensflare);
  Scene.add(SunFlare);
  
  /************************** Create Sun **************************/
  let geometry = new THREE.SphereGeometry( 0.0046524726, 32, 32 );
  var sunMat = new THREE.ShaderMaterial({
    vertexShader: document.getElementById('sun-vertex').textContent,
    fragmentShader: document.getElementById('sun-fragment').textContent
  });
  SunObj = new THREE.Mesh( geometry, sunMat );
  SunObj.position.set(0, 0, 0);
  Scene.add( SunObj );
  SunObj.visible = false;

  /************************** Create Planets *********************/
  for (const planet of Planets) {
    let name = planet.name;
    let geometry = new THREE.SphereGeometry( planet.radius, 64, 64 );
    geometry.computeTangents();
    let planetMat;
    if(name == 'earth') {
      planetMat = createEarthMath(planet);
    } else {
      planetMat = createPlanetMat(planet);
    }
    let planetobj = new THREE.Mesh( geometry, planetMat );
    planetobj.name = name;
    var planetpos = posInOrbit(planet.obP,planet.obP.M0);
    planetobj.position.set(0,0,0);
    planetobj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),planet.northP);
    if (name == "moon") {
      let earth = PlanetObjects.find(x=> x.name == 'earth');
      planetpos.add(earth.object.position);
    }
    planetobj.position.set(planetpos.x, planetpos.y, planetpos.z);
    Scene.add(planetobj);
    PlanetObjects.push({name: name, object: planetobj, mat: planetMat});

  }
  // Create Saturn rings
  let sat = Planets.find(x=> x.name == 'saturn');
  let satob = PlanetObjects.find(x=> x.name == 'saturn');
  let ringgeo = new THREE.RingGeometry(0.00044719888, 0.000934679079, 64, 2);
  ringgeo.computeTangents();
  let satloader = new THREE.TextureLoader(loadManager);
  let tex = satloader.load(sat.texR);
  tex.anisotropy = 16;
  var ringmat = new THREE.ShaderMaterial({
    uniforms: {
      lightPos:  {value: lightPos},
      satPos:    {value: satob.object.position},
      lightCol:  {value: lightCol},
      lightI:    {value: lightI},
      specI:     {value: 90},
      shininess: {value: 34},
      ambient:   {value: 0},
      exposure:  {value: 0.042},
      useNormal: {value: 0.0},
      normalStrength: {value: 0.0},
      tex:       {value: tex},
      depth:     {value: null}},
    side: THREE.DoubleSide,
    transparent: true,
    vertexShader: document.getElementById('rings-vertex').textContent,
    fragmentShader: document.getElementById('rings-fragment').textContent
  });
  let ring = new THREE.Mesh(ringgeo, ringmat);
  ring.position.set(0,0,0);
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),sat.northP);
  ring.position.set(satob.object.position.x, satob.object.position.y, satob.object.position.z);
  Scene.add(ring);
  SaturnRings = {object: ring, mat: ringmat};

  /************************** Create Orbits **************************/
  for (const planet of Planets) {
    createOrbit(planet);
    if (planet.name == "moon") {
      let earth = PlanetObjects.find(x=> x.name == 'earth');
      let moonorb = Orbits.find(x=> x.name == "moon");
      moonorb.object.position.add(earth.object.position);
    }
  }

  /************************** Create Rot Axis **************************/
  for (const planet of PlanetObjects) {
    let name = planet.name;
    let p = Planets.find(x=> x.name == name);
    let length = p.radius*2;
    createNorthPoleVector(name, planet.object.position, p.northP, length);
  }
  // And Labels
  createLabels();

  /************************** Helper GUI **************************/
  // const gui = new GUI();
  // const lightFolder = gui.addFolder('Sun');
  // let earthmat = PlanetObjects.find(x=> x.name == 'earth').mat;
  // lightFolder.add(ringmat.uniforms.ambient, 'value', 0, 0.5).name('ambient');
  // lightFolder.add(ringmat.uniforms.shininess, 'value', 0, 1024).name('shininess');
  // lightFolder.add(ringmat.uniforms.lightI, 'value', 0, 100).name('light intensity');
  // lightFolder.add(ringmat.uniforms.specI, 'value', 0, 500).name('specular intensity');
  // lightFolder.add(ringmat.uniforms.exposure, 'value', 0, 0.07).name('shaderExposure');
  // lightFolder.add(ringmat.uniforms.useNormal, 'value', 0, 1).name('Toggle normal map');
  // lightFolder.open();
  // const axesHelper = new THREE.AxesHelper( 5 );
  // Scene.add( axesHelper );

  // disable culling for no hitching on texture decompress
  Scene.traverse(obj => obj.frustumCulled = false);

  window.addEventListener( 'resize', function () {
    Camera.aspect = window.innerWidth / window.innerHeight;
    Camera.updateProjectionMatrix();
    Renderer.setSize( window.innerWidth, window.innerHeight );
    Composer.setSize( window.innerWidth, window.innerHeight );
  }, false ); 



  CurrentTimeJDN = UTCtoJDN(new Date());
  TimeMultiplier = 1;

  // correct earth day/night cycle rotation
  let seconds = (CurrentTimeJDN - D0)*86400;
  let rot_speed = Planets.find(x=> x.name == 'earth').rotatRate;
  let e = PlanetObjects.find(x=> x.name == 'earth').object;
  e.rotateY(normalizeAngleRad(3.8));
  e.rotateY(normalizeAngleRad(seconds*rot_speed));
  /************************** Animate **************************/
  var delta = 0;
  function animate() {
    requestAnimationFrame(animate);
    delta = Clock.getDelta();

    // update current JDN and page clock
    CurrentTimeJDN += (delta/86400)*TimeMultiplier;
    updateClock();
    
    //Planet Rotation
    for (const p of PlanetObjects) {
      let rotSpeed = Planets.find(x=> x.name == p.name).rotatRate;
      p.object.rotateY(rotSpeed*delta*TimeMultiplier);
      if (p.name == 'saturn') {SaturnRings.object.rotateZ(rotSpeed*delta*TimeMultiplier);}
    }

    // Planet movement in its orbit
    for (const planet of PlanetObjects) {
      let name = planet.name;
      let vars = Planets.find(x=> x.name == name);
      
      let M0 = vars.obP.M0;
      let M = M0 + vars.obP.N * (CurrentTimeJDN-D0);
      var pos = posInOrbit(vars.obP, normalizeAngle(M));

      planet.object.position.set(pos.x,pos.y,pos.z);
      if (name == 'saturn') {SaturnRings.object.position.set(pos.x,pos.y,pos.z);}
    }
    // moon and moon orbit movement
    let moon = Planets.find(x=> x.name == 'moon');
    let moonobj = PlanetObjects.find(x=> x.name == 'moon').object;
    let e = PlanetObjects.find(x=> x.name == 'earth').object.position;
    let orbit = Orbits.find(x=>x.name == 'moon').object;
    let M = moon.obP.M0 + moon.obP.N * (CurrentTimeJDN-D0);
    let mp = posInOrbit(moon.obP, normalizeAngle(M));
    moonobj.position.set(e.x+mp.x,e.y+mp.y,e.z+mp.z);
    orbit.position.set(e.x,e.y,e.z);

    // Camera
    isAccelTime();
    if (Init) { goToPlanet('saturn'); Init = false; }
    if (!InAccelTime && !InOverview && !Locked) {
      let lk = PlanetObjects.find(x=> x.name == CurrentTarget);
      Controls.target.set(lk.object.position.x, lk.object.position.y, lk.object.position.z);
      Controls.update();
    }
    if (Locked) {
      let p = PlanetObjects.find(x=> x.name == CurrentTarget).object;
      let r = Planets.find(x=> x.name == CurrentTarget).radius;
      Controls.target.set(p.position.x, p.position.y, p.position.z);
      let dir = new THREE.Vector3(p.position.x,p.position.y,p.position.z);
      dir.normalize().negate();
      Camera.position.set(p.position.x+dir.x*r*6, p.position.y+dir.y*r*6, p.position.z+dir.z*r*6);
      Controls.maxDistance = 50;
      Controls.minDistance = 0.000001;
      Controls.update();
    }


    // Labels
    updateLabels();
    // Axis Lines
    updateNorthPoleVectors();
    Composer.render();
  }

  loadManager.onLoad = function () {
    document.getElementById('loading').remove();
    animate();
  };
}
main();



/************************** Options UI **************************/
// Toggle Drawing North Pole Vectors
var checkbox = document.getElementById('draw-north-poles');
checkbox.addEventListener('change', function(){
  if(this.checked){
    for (const np of NorthPoleVectors) {np.object.visible = true;}
  } else {
    for (const np of NorthPoleVectors) {np.object.visible = false;}
  }
});
// Toggle Drawing Orbits
var orbcheckbox = document.getElementById('draw-orbits');
orbcheckbox.addEventListener('change', function(){
  if(this.checked){
    for (const obj of Orbits) {obj.object.visible = true;}
  } else {
    for (const obj of Orbits) {obj.object.visible = false;}
  }
});
// Toggle real sun size in sky
var suncheckbox = document.getElementById('real-sun-size');
suncheckbox.addEventListener('change', function(){
  if(this.checked){
    SunFlare.visible = false;
    SunObj.visible = true;
  } else { 
    SunFlare.visible = true;
    SunObj.visible = false; 
  }
});
// Toggle Labels
var labelscheckbox = document.getElementById('draw-labels');
labelscheckbox.addEventListener('change', function(){
  if(this.checked){
    for (const l of Labels) {l.sprite.visible = true;}
  } else { 
    for (const l of Labels) {l.sprite.visible = false;}
  }
});
// Follow planet
var followcheckbox = document.getElementById('follow-planet');
followcheckbox.addEventListener('change', function(){
  if(this.checked && CurrentTarget != null){
    Locked = true;
  } else { 
    this.checked = false;
    Locked = false;
    goToPlanet(CurrentTarget);
  }
});
// Go to planet
var elements = document.getElementsByClassName('gotoplanet');
for (const e of elements) {
  e.addEventListener('click', function(){
    if(InAccelTime) {return;}
    if(Locked) {return;}
    let name = this.innerHTML;
    name = name.toLowerCase();
    goToPlanet(name);
  });
}
// Go to overview
var overview = document.getElementById('goto-overview');
overview.addEventListener('click', function(){
    if(Locked) {return;}
    Camera.position.set(13,13,13);
    Controls.target.set(0,0,0);
    Controls.maxDistance = 50;
    Controls.update();
    InOverview = true;
    CurrentTarget = null;
    Locked = false;
});
// Reset time multiplier
var bttnRst = document.getElementById('reset');
bttnRst.addEventListener('click', function(){
  TimeMultiplier = 1;
});
// Time x100
var bttnRst = document.getElementById('f1');
bttnRst.addEventListener('click', function(){
  TimeMultiplier += 100;
});
// Time x100,000
var bttnRst = document.getElementById('f2');
bttnRst.addEventListener('click', function(){
  TimeMultiplier += 100000;
});
// Set time to now
var bttnRst = document.getElementById('current');
bttnRst.addEventListener('click', function(){
  let newTime = UTCtoJDN(new Date());
  let seconds = (newTime - CurrentTimeJDN)*86400;
  let rot_speed = Planets.find(x=> x.name == 'earth').rotatRate;
  let e = PlanetObjects.find(x=> x.name == 'earth').object;
  e.rotateY(normalizeAngleRad(seconds*rot_speed));
  CurrentTimeJDN = newTime;
  TimeMultiplier = 1;
});
// Time -x100
var bttnRst = document.getElementById('b1');
bttnRst.addEventListener('click', function(){
  TimeMultiplier += -100;
});
// Time -x100,000
var bttnRst = document.getElementById('b2');
bttnRst.addEventListener('click', function(){
  TimeMultiplier += -100000;
});