import * as THREE from "./dist/three.module.js";
import {OrbitControls} from "./dist/OrbitControls.js";
import {GUI} from "./dist/dat.gui.module.js";

let scene, camera, renderer;

function main() {
  /************************** Camera **************************/
  camera = new THREE.PerspectiveCamera(
    70,        // fov
    window.innerWidth / window.innerHeight, //aspect
    0.00001,   // near clipping
    10000      // far clipping
    );
  // camera.position.set(0, 0, 3);
  camera.position.z = -0.01;
  // camera.position.x = 0.01;
  // camera.position.x = -0.1;

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
        sky.rotateX(-0.4090926103); // obliquity of ecliptic in radians
        scene.add(sky);
    });
  }
  /************************** Sun Light **************************/
  {
    var lightPos = new THREE.Vector3(5, 0, 0);
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
    var useNormal = 1.0;
    var normalStrength = 3.0;
    let geometry = new THREE.SphereGeometry( 0.0046524726, 64, 64 );
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
    var Sun = new THREE.Mesh( geometry, planetMat );
    scene.add( Sun );
  }
  /************************** Earth **************************/
  {
    let geometry = new THREE.SphereGeometry( 0.0000426352, 32, 16 );
    let material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
    let sphere = new THREE.Mesh( geometry, material );
    sphere.position.set(0, 0, 0.006);
    scene.add( sphere );
  }
  /************************** GUI **************************/
  const gui = new GUI();
  const lightFolder = gui.addFolder('Sun');
  lightFolder.add(planetMat.uniforms.ambient, 'value', 0, 0.5).name('ambient');
  lightFolder.add(planetMat.uniforms.shininess, 'value', 0, 512).name('shininess');
  lightFolder.add(planetMat.uniforms.lightI, 'value', 0, 2).name('light intensity');
  lightFolder.add(planetMat.uniforms.specI, 'value', 0, 2).name('specular intensity');
  lightFolder.add({rotation: 0}, 'rotation', 0, 0.1).name('rotate Y').onChange((value)=>{Sun.rotateY(value)});
  lightFolder.add(planetMat.uniforms.useNormal, 'value', 0, 1).name('Toggle normal map');
  lightFolder.add(planetMat.uniforms.normalStrength, 'value', 1, 4).name('Normal Strength');
  lightFolder.open();
  const axesHelper = new THREE.AxesHelper( 5 );
  // scene.add( axesHelper );

  function animate() {
    renderer.render(scene, camera);

    Sun.rotateY(0.001);

    requestAnimationFrame(animate);
  }
  animate();
}
main();
