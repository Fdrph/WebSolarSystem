import * as THREE from "./dist/three.module.js";
import {OrbitControls} from "./dist/OrbitControls.js";
import {GUI} from "./dist/dat.gui.module.js";

var scene, camera, renderer;
var RAD = Math.PI/180;
var DEG = 180/Math.PI;

// J2000 Julian Date -> 2451545.0
// D0 = 2021-Aug-01 00:00:00 for these ephemeris
// and the D0 Julian Date is:
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
  northP: new THREE.Vector3(-0.08169670885729537,0.9924581847421388,0.09139146185626497),
  orbCol: 0xa6a6a6,
  tex: "resources/images/mars.jpg",
  texN: "resources/images/mars-normal.png"},
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
  orbCol: 0xf0ea19,
  tex: "resources/images/mars.jpg",
  texN: "resources/images/mars-normal.png"},
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
  orbCol: 0x5470d9,
  tex: "resources/images/mars.jpg",
  texN: "resources/images/mars-normal.png"},
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
  orbCol: 0xe64219,
  tex: "resources/images/mars.jpg",
  texN: "resources/images/mars-normal.png"},
  {
  name: "jupiter",
  obP: {  EC: 0.0,   
          IN: 1.0,  
          A: 1.0,      
          M0: 189.0,     
          W: 286.0,      
          OM: 49.0,     
          N: 0.0},
  northP: new THREE.Vector3(-0.03590615289334038,0.9992477137401423,-0.01465451362205603),
  orbCol: 0xa6a6a6,
  tex: "resources/images/mars.jpg",
  texN: "resources/images/mars-normal.png"},
  {
  name: "saturn",
  obP: {  EC: 0.0,   
          IN: 1.0,  
          A: 1.0,      
          M0: 189.0,     
          W: 286.0,      
          OM: 49.0,     
          N: 0.0},
  northP: new THREE.Vector3(0.4624261111012926,0.8825330678596439,0.08542526503312815),
  orbCol: 0xa6a6a6,
  tex: "resources/images/mars.jpg",
  texN: "resources/images/mars-normal.png"},
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
  orbCol: 0xa6a6a6,
  tex: "resources/images/mars.jpg",
  texN: "resources/images/mars-normal.png"},
  {
  name: "neptune",
  obP: {  EC: 0.0,   
          IN: 1.0,  
          A: 1.0,      
          M0: 189.0,     
          W: 286.0,      
          OM: 49.0,     
          N: 0.0},
  northP: new THREE.Vector3(-0.30781771841586425,0.8819092026544161,0.35704959109723644),
  orbCol: 0xa6a6a6,
  tex: "resources/images/mars.jpg",
  texN: "resources/images/mars-normal.png"
}]

function TrueAnom(ec, m) {
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
  return 360+(DEG)*ta;
}

function posInOrbit(ob, M) {
  let ta = TrueAnom(ob.EC,M)*RAD;
  let om  = ob.OM *RAD;
  let w   = ob.W  *RAD;
  let inc = ob.IN *RAD;
  let r = Math.abs(ob.A*(1-ob.EC**2)) / (1+ob.EC*Math.cos(ta));
  let planetX = r*(Math.cos(om)*Math.cos(w+ta) - Math.sin(om)*Math.cos(inc)*Math.sin(w+ta));
  let planetY = r*(Math.sin(om)*Math.cos(w+ta) + Math.cos(om)*Math.cos(inc)*Math.sin(w+ta));
  let planetZ = r*Math.sin(inc)*Math.sin(w+ta);
  return {x: planetY, y: planetZ, z: planetX}
}

function drawOrbit(ob, step) {
  let matparams = { color: ob.orbCol, toneMapped: false, opacity: 0.5, transparent: true};
  const orbitmat = new THREE.LineBasicMaterial(matparams);
  const points = [];
  let offset = 0;
  do {
    let pos = posInOrbit(ob.obP, ob.obP.M0 + offset);
    points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
    offset = offset + step;
  } while(offset <= 360);
  const orbitgeo = new THREE.BufferGeometry().setFromPoints( points );
  const orbit = new THREE.Line( orbitgeo, orbitmat );
  scene.add(orbit);
}

// Julian day from UTC date
function jdcalc(jd) {
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
function datefromjd(julian) {
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
  return  new Date(yr,mon,Math.floor(dayt),utht,utmt,utst)
}

// consolelog(jdcalc(new Date()));
// console.log(datefromjd(2459427.5003704));

function main() {
  /************************** Camera **************************/
  camera = new THREE.PerspectiveCamera(
    60,        // fov
    window.innerWidth / window.innerHeight, //aspect
    0.00001,   // near clipping
    10000      // far clipping
    );
  // camera.position.z = -0.01;

  /************************** Renderer **************************/
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.022;
  renderer.physicallyCorrectLights = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.id = "canvas";
  document.body.appendChild(renderer.domElement);
  window.addEventListener( 'resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }, false );  
  
  const loadManager = new THREE.LoadingManager();
  loadManager.onLoad = ()=>{ document.getElementById('loading').remove() }
  scene = new THREE.Scene();
  /************************** Controls **************************/
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  /************************** Skydome **************************/
  {
    const loader = new THREE.TextureLoader(loadManager);
    const texture = loader.load(
      'resources/images/milkyWay.jpg',
      () => {
        const skyDome = new THREE.SphereGeometry(9999, 16, 16);
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
        scene.add(sky);
    });
  }
  /************************** Sun Light Param **************************/
  {
    var lightPos = new THREE.Vector3(0, 0, 0);
    var lightCol = new THREE.Color(0xfff2ed);
    var lightI = 100;
    var specI = 2.6;
    var ambient = 0.01;
    var shininess = 1.3;
    let p = new THREE.PointLight(lightCol, lightI, 0);
    p.position.set(0,0,1);
    scene.add(p);
  }
  /************************** Planet Material **************************/
  {
    var useNormal = 1.0;
    var normalStrength = 1.6;
    const loader = new THREE.TextureLoader(loadManager);
    let texture = loader.load('resources/images/mars.jpg');
    texture.anisotropy = 8;
    let textureN = loader.load('resources/images/mars-normal.png');
    var uniforms = {
      lightPos:  {value: lightPos},
      lightCol:  {value: lightCol},
      lightI:    {value: lightI},
      specI:     {value: specI},
      shininess: {value: shininess},
      ambient:   {value: ambient},
      useNormal: {value: useNormal},
      normalStrength: {value: normalStrength},
      tex:       {value: texture},
      texNormal: {value: textureN}
    }
    var planetMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: document.getElementById('phong-vertex').textContent,
      fragmentShader: document.getElementById('phong-fragment').textContent
    });
  }
  /************************** Sun **************************/
  {
    // 0.0046524726 CORRECT SUN RADIUS
    let geometry = new THREE.SphereGeometry( 0.0046524726, 32, 32 );
    var sunMat = new THREE.ShaderMaterial({
      vertexShader: document.getElementById('sun-vertex').textContent,
      fragmentShader: document.getElementById('sun-fragment').textContent
    });
    var SunMesh = new THREE.Mesh( geometry, sunMat );
    SunMesh.position.set(0, 0, 0);
    scene.add( SunMesh );
  }
  /************************** Planets **************************/
  {
    // 0.0000426352 CORRECT EARTH RADIUS
    let earth = Planets.find(x=> x.name == 'earth');
    // let earthgeo = new THREE.SphereGeometry( 0.0000426352, 64, 64 );
    let earthgeo = new THREE.SphereGeometry( 0.14, 64, 64 );
    earthgeo.computeTangents();
    var earthobj = new THREE.Mesh( earthgeo, planetMat );
    let earthpos = posInOrbit(earth.obP,earth.obP.M0);
    earthobj.position.set(0,0,0);
    earthobj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),earth.northP);
    earthobj.position.set(earthpos.x, earthpos.y, earthpos.z);
    scene.add(earthobj);

    let venus = Planets.find(x=> x.name == 'venus');
    var venusobj = new THREE.Mesh(earthgeo, planetMat);
    let venuspos = posInOrbit(venus.obP, venus.obP.M0);
    venusobj.position.set(0,0,0);
    venusobj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),venus.northP);
    venusobj.position.set(venuspos.x, venuspos.y, venuspos.z);
    scene.add(venusobj);

    let mars = Planets.find(x=> x.name == 'mars');
    var marsobj = new THREE.Mesh(earthgeo, planetMat);
    let marspos = posInOrbit(mars.obP, mars.obP.M0);
    marsobj.position.set(0,0,0);
    marsobj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),mars.northP);
    marsobj.position.set(marspos.x, marspos.y, marspos.z);
    scene.add(marsobj);

    let uranus = Planets.find(x=> x.name == 'uranus');
    var uranusobj = new THREE.Mesh(earthgeo, planetMat);
    let uranuspos = posInOrbit(uranus.obP, uranus.obP.M0);
    uranusobj.position.set(0,0,0);
    uranusobj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),uranus.northP);
    uranusobj.position.set(uranuspos.x, uranuspos.y, uranuspos.z);
    scene.add(uranusobj);

    camera.position.set(uranuspos.x+0.7, uranuspos.y, uranuspos.z+0.7);
    controls.target.set(uranuspos.x, uranuspos.y, uranuspos.z);
    // camera.position.set(0,0,3);
    // controls.target.set(0,0,0);
  }
  /************************** Orbits **************************/
  {
    let mercury = Planets.find(x=> x.name == 'mercury');
    let venus = Planets.find(x=> x.name == 'venus');
    let earth = Planets.find(x=> x.name == 'earth');
    let mars = Planets.find(x=> x.name == 'mars');
    let uranus = Planets.find(x=> x.name == 'uranus');
    drawOrbit(mercury, 0.5);
    drawOrbit(venus, 0.5);
    drawOrbit(earth, 0.5);
    drawOrbit(mars, 0.5);
    drawOrbit(uranus, 0.5);
  }
  /************************** GUI **************************/
  const gui = new GUI();
  const lightFolder = gui.addFolder('Sun');
  lightFolder.add(planetMat.uniforms.ambient, 'value', 0, 0.5).name('ambient');
  lightFolder.add(planetMat.uniforms.shininess, 'value', 0, 512).name('shininess');
  lightFolder.add(planetMat.uniforms.lightI, 'value', 0, 100).name('light intensity');
  lightFolder.add(planetMat.uniforms.specI, 'value', 0, 8).name('specular intensity');
  lightFolder.add(planetMat.uniforms.useNormal, 'value', 0, 1).name('Toggle normal map');
  lightFolder.add(planetMat.uniforms.normalStrength, 'value', 1, 4).name('Normal Strength');
  lightFolder.add(renderer, 'toneMappingExposure', 0, 0.07).name('Exposure');
  lightFolder.open();
  const axesHelper = new THREE.AxesHelper( 5 );
  scene.add( axesHelper );

  function animate() {
    renderer.render(scene, camera);

    earthobj.rotateY(0.001);
    venusobj.rotateY(0.004);
    uranusobj.rotateY(0.004);

    requestAnimationFrame(animate);
  }
  animate();
}
main();

// uranus north pole vector
// let NorthP = lat_long_to_vector(257.64,7.72);
// draw_unit_vector(NorthP, scene);

function draw_unit_vector(vec, scene) {
  let linegeo = new THREE.BufferGeometry().setFromPoints( [new THREE.Vector3(0,0,0),vec] );
  let arrow = new THREE.Line( linegeo, new THREE.LineBasicMaterial({toneMapped: false}) );
  scene.add(arrow);
}

function lat_long_to_vector(ra, dec) {
  let RA = ra*RAD;
  let DEC = dec*RAD;
  let px = Math.cos(DEC)*Math.cos(RA);
  let py = Math.cos(DEC)*Math.sin(RA);
  let pz = Math.sin(DEC);
  let dir = new THREE.Vector3(py,pz,px);
  dir = dir.normalize();
  return dir
}


// normalize angles to positive [0,360]
// do this after calculating M for a certain date
// and after calculating true anomaly?
// if (degree >= 0) {
//   degree % 360
// } else {
//   degree % -360 + 360
// }



