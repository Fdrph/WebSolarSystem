import * as THREE from "./dist/three.module.js";
import {OrbitControls} from "./dist/OrbitControls.js";
import {GUI} from "./dist/dat.gui.module.js";

var scene, camera, renderer;
var RAD = Math.PI/180;
var DEG = 180/Math.PI;

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
  const orbitmat = new THREE.LineBasicMaterial( { color: 0x0000ff } );
  const points = [];
  let offset = 0;
  do {
    let pos = posInOrbit(ob, ob.M0 + offset);
    points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
    offset = offset + step;
  } while(offset <= 360);
  const orbitgeo = new THREE.BufferGeometry().setFromPoints( points );
  const orbit = new THREE.Line( orbitgeo, orbitmat );
  scene.add(orbit);
}

// Earth 2021-Aug-01 00:00 is D0
var D0 = 2459584.2739251; // Julian Date Number at D0
var Planets = [{
  name: "mercury",
  obP: {  EC: 0.2056300688203926,    // eccentricity e
          IN: 7.003660025940505,     // inclination i
          A: 0.3870981083367395,     // semi major axis a
          M0: 32.62385316739722,     // mean anomaly M
          W: 29.18672594563536,      // argument of periphileon w
          OM: 48.30381657879919,     // long. asc. node omega
          N: 4.092347800298432},     // mean motion n
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
  tex: "resources/images/mars.jpg",
  texN: "resources/images/mars-normal.png"
}]

function main() {
  /************************** Camera **************************/
  camera = new THREE.PerspectiveCamera(
    60,        // fov
    window.innerWidth / window.innerHeight, //aspect
    0.00001,   // near clipping
    10000      // far clipping
    );
  // camera.position.set(0, 0, 3);
  // camera.position.z = -0.01;
  // camera.position.x = 0.01;
  // camera.position.x = -0.1;
  // camera.position.y = 5;

  /************************** Renderer **************************/
  renderer = new THREE.WebGLRenderer({ antialias: true });
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
        const skyDome = new THREE.SphereGeometry(9999, 64, 64);
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
  /************************** Sun Light **************************/
  {
    var lightPos = new THREE.Vector3(0, 0, 0);
    var lightCol = new THREE.Color(0xfff2ed);
    var lightI = 1;
    var specI = 0.1;
    var ambient = 0.01;
    var shininess = 0.3;
    // let p = new THREE.PointLight(lightCol, lightI, 0);
    // p.position.set(0,0,1);
    // scene.add(p);
  }
  /************************** Sun **************************/
  {
    //let geometry = new THREE.SphereGeometry( 0.0046524726, 64, 64 ); SUN RADIUS CORRECT
    var useNormal = 1.0;
    var normalStrength = 3.0;
    let geometry = new THREE.SphereGeometry( 0.0000426352, 64, 64 );
    geometry.computeTangents();
    const loader = new THREE.TextureLoader(loadManager);
    let texture = loader.load('resources/images/mars.jpg');
    let textureN = loader.load('resources/images/mars-normal.png');
    let uniforms = {
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
    var EarthMesh = new THREE.Mesh( geometry, planetMat );


    let mercury = Planets.find(x=> x.name == 'mercury');
    let venus = Planets.find(x=> x.name == 'venus');
    let earth = Planets.find(x=> x.name == 'earth');
    let mars = Planets.find(x=> x.name == 'mars');
    drawOrbit(mercury.obP, 0.5);
    drawOrbit(venus.obP, 0.5);
    drawOrbit(earth.obP, 0.5);
    drawOrbit(mars.obP, 0.5);

    let earthpos = posInOrbit(earth.obP, earth.obP.M0);
    EarthMesh.position.set(earthpos.x, earthpos.y, earthpos.z);
    scene.add( EarthMesh );

    camera.position.set(earthpos.x, earthpos.y, earthpos.z+0.08);
    controls.target.set(earthpos.x, earthpos.y, earthpos.z);
  }
  /************************** Earth **************************/
  // {
  //   let geometry = new THREE.SphereGeometry( 0.0000426352, 32, 16 );
  //   let material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
  //   let sphere = new THREE.Mesh( geometry, material );
  //   sphere.position.set(0, 0, 0.006);
  //   scene.add( sphere );
  // }
  /************************** GUI **************************/
  const gui = new GUI();
  const lightFolder = gui.addFolder('Sun');
  lightFolder.add(planetMat.uniforms.ambient, 'value', 0, 0.5).name('ambient');
  lightFolder.add(planetMat.uniforms.shininess, 'value', 0, 512).name('shininess');
  lightFolder.add(planetMat.uniforms.lightI, 'value', 0, 2).name('light intensity');
  lightFolder.add(planetMat.uniforms.specI, 'value', 0, 2).name('specular intensity');
  lightFolder.add({rotation: 0}, 'rotation', 0, 0.1).name('rotate Y').onChange((value)=>{EarthMesh.rotateY(value)});
  lightFolder.add(planetMat.uniforms.useNormal, 'value', 0, 1).name('Toggle normal map');
  lightFolder.add(planetMat.uniforms.normalStrength, 'value', 1, 4).name('Normal Strength');
  lightFolder.open();
  const axesHelper = new THREE.AxesHelper( 5 );
  // scene.add( axesHelper );

  function animate() {
    renderer.render(scene, camera);

    EarthMesh.rotateY(0.001);

    requestAnimationFrame(animate);
  }
  animate();
}
main();
