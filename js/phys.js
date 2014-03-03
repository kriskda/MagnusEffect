var renderer;
var scene;
var camera;
var cameraControls;
var controller;

var container = document.getElementById("threejs_container");
var width = container.offsetWidth;
var height = container.offsetHeight;

var accumulator = 0;
var currentTime = getTimeInSeconds();


init();
animate();


function init() {
	initRenderer();
	initScene();
	initCamera();
	initLight();	
	initReferenceView();	
	initMVC();
}


function initRenderer() {
	renderer = new THREE.WebGLRenderer({precision: 'lowp', antialias: true, preserveDrawingBuffer: false});
    renderer.setSize(width, height);  
    renderer.setClearColor("rgb(255, 255, 255)", 1); 

	container.appendChild(renderer.domElement);
}


function initScene() {
    scene = new THREE.Scene();
}


function initCamera() {
    camera = new THREE.PerspectiveCamera(55, width / height, 1, 100);
    camera.position.set(3, 1, 3);   
    
    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);    
    cameraControls.noPan = false;
    cameraControls.noKeys = true;
}


function initLight() {
    var light = new THREE.PointLight("rgb(255, 255, 255)");
    
    light.position.set(0, 50, 10);
    scene.add(light);        
}


function initReferenceView() {
	var lineGeometryX = new THREE.Geometry();	
	var lineMaterialX = new THREE.LineBasicMaterial({color: "rgb(255, 0, 0)", linewidth: 2});

	lineGeometryX.vertices.push(new THREE.Vector3(-10, 0, 0));
	lineGeometryX.vertices.push(new THREE.Vector3(10, 0, 0));
	
	scene.add(new THREE.Line(lineGeometryX, lineMaterialX));
	
	var lineGeometryY = new THREE.Geometry();	
	var lineMaterialY = new THREE.LineBasicMaterial({color: "rgb(0, 255, 0)", linewidth: 2});

	lineGeometryY.vertices.push(new THREE.Vector3(0, -10, 0));
	lineGeometryY.vertices.push(new THREE.Vector3(0, 10, 0));
	
	scene.add(new THREE.Line(lineGeometryY, lineMaterialY));
	
	var lineGeometryZ = new THREE.Geometry();	
	var lineMaterialZ = new THREE.LineBasicMaterial({color: "rgb(0, 0, 255)", linewidth: 2});

	lineGeometryZ.vertices.push(new THREE.Vector3(0, 0, -10));
	lineGeometryZ.vertices.push(new THREE.Vector3(0, 0, 10));
	
	scene.add(new THREE.Line(lineGeometryZ, lineMaterialZ));	

	for (var i = -15 ; i <= 15 ; i++) {
		var lineGeometryPlane = new THREE.Geometry();
		var lineMaterialPlane = new THREE.LineBasicMaterial({color: "rgb(100, 100, 100)", linewidth: 0.5});
		
		lineGeometryPlane.vertices.push(new THREE.Vector3(i, 0, -15));
		lineGeometryPlane.vertices.push(new THREE.Vector3(i, 0, 15));
		
		scene.add(new THREE.Line(lineGeometryPlane, lineMaterialPlane));	
	}
	
	for (var i = -15 ; i <= 15 ; i++) {
		var lineGeometryPlane = new THREE.Geometry();
		var lineMaterialPlane = new THREE.LineBasicMaterial({color: "rgb(100, 100, 100)", linewidth: 0.5});
		
		lineGeometryPlane.vertices.push(new THREE.Vector3(-15, 0, i));
		lineGeometryPlane.vertices.push(new THREE.Vector3(15, 0, i));
		
		scene.add(new THREE.Line(lineGeometryPlane, lineMaterialPlane));	
	}	
	
}


function initMVC() {
	var dt = 0.01;
	
	var model = new Model();
	var view = new View();	
	var integrator = new RK4Integrator(dt);

	model.view = view;
	model.integrator = integrator;
	
	controller = new Controller(model);
	controller.addDatGUI();
	controller.resetSimulation();

	view.addToScene(scene);		
}


function animate() {
	var newTime = getTimeInSeconds();
	var frameTime = newTime - currentTime;
	currentTime = newTime;

	accumulator += frameTime;
		
	var dt = controller.model.integrator.dt;

	while (accumulator >= dt) {
		
		if (controller.isSimulationRunning) {
			controller.update();
		}

		accumulator -= dt;                
	}	
		
	/* Will always point to the center of the frame */
	cameraControls.target = new THREE.Vector3(0, 0, 0);
	cameraControls.update();

	renderer.render(scene, camera);
    requestAnimationFrame(animate);	
}


function getTimeInSeconds() {
    return new Date().getTime() / 1000;
}


function Controller(model) {
	
	this.model = model;
	this.isSimulationRunning = false;

	var self = this;
	
	this.addDatGUI = function() {
		var gui = new dat.GUI({ autoPlace: false });
		var controlsContainer = document.getElementById('controls-container');
		controlsContainer.appendChild(gui.domElement);
		
		gui.add(self.model, 'm', 0.1, 10, 0.01).onChange(function(value) {
			self.resetSimulation();
		});

		gui.add(self.model, 'vx', 0, 10, 0.01).onChange(function(value) {
			self.resetSimulation();
		});

		gui.add(self.model, 'vy', 0, 10, 0.01).onChange(function(value) {
			self.resetSimulation();
		});
		
		gui.add(self.model, 'vz', 0, 10, 0.01).onChange(function(value) {
			self.resetSimulation();
		});		
		
		gui.add(self.model, 'omegax', -10000, 10000, 0.01).onChange(function(value) {
			self.resetSimulation();
		});		

		gui.add(self.model, 'omegay', -10000, 10000, 0.01).onChange(function(value) {
			self.resetSimulation();
		});	
		
		gui.add(self.model, 'omegaz', -10000, 10000, 0.01).onChange(function(value) {
			self.resetSimulation();
		});			
	
		gui.add(self, 'resetSimulation').name('Restart');
		gui.add(self, 'toggleSimulationRunning').name('Start / Stop');		
	};
	
	this.toggleSimulationRunning = function() {
		this.isSimulationRunning = !this.isSimulationRunning;
	};
	
	this.resetSimulation = function() {
		this.model.restart();
	};
		
	this.update = function() {
		this.model.move();
	};
	
}


function View() {
	
	var TRAJECTORY_BUFFER = 2000;
	
	var particle;
	var trajectory;

	var self = this;

	initParticle();
	initTrajectory();
	
	function initParticle() {		
        var geometry = new THREE.SphereGeometry(0.05, 32, 32);
        var material = new THREE.MeshPhongMaterial({color: "rgb(255, 0, 0)"});
        
        particle = new THREE.Mesh(geometry, material);
	};
	
	function initTrajectory() {		
		var geometry = new THREE.Geometry();
        var material = new THREE.LineBasicMaterial({ color: "rgb(0, 0, 0)", linewidth: 1.5 });
        
        for (var i = 0 ; i < TRAJECTORY_BUFFER + 1 ; i++) {
			geometry.vertices.push(new THREE.Vector3(-10, 0, 0));
		}
                
        trajectory = new THREE.Line(geometry, material);		
	};
	
	this.addToScene = function(scene) {		
		scene.add(particle);
		scene.add(trajectory);
	};
	
	this.update = function(pos, traj) {	
		for (var i = 0 ; i < TRAJECTORY_BUFFER + 1 ; i++) {
			trajectory.geometry.vertices[i].x = traj[i][0];
			trajectory.geometry.vertices[i].y = traj[i][1];
			trajectory.geometry.vertices[i].z = traj[i][2];
		}

		trajectory.geometry.verticesNeedUpdate = true;

		particle.position.x = pos[0];
		particle.position.y = pos[1];
		particle.position.z = pos[2];
	};
	
}


function Model() {

	this.m = 1;	
	
	this.vx = 0;
	this.vy = 0;
	this.vz = 0;

	this.omegax = 0;
	this.omegay = 0;
	this.omegaz = 0;

	this.view;
	this.integrator;

	this.pos = [-2, 0, 0];
	this.vel = [this.vx, this.vy, this.vz];
	this.trajectory = [];

	var self = this;
	var TRAJECTORY_BUFFER = 2000;
	
	var ro = 0.1;
	var Cd = 1.2;
	var g = 9.81;
	var B = 0.00041;
	
	initTrajectory();

	function initTrajectory() {		
		for (var i = 0 ; i < TRAJECTORY_BUFFER + 1 ; i++) {
			self.trajectory.push(self.pos);
		}		
	};

    this.accel = function(vel) { 
		var vx = vel[0];
		var vy = vel[1];
		var vz = vel[2];
		
		// Ball with 30 cm / 0.3 m radius
		var dragCoef = ro * Math.PI * 0.3 * Cd; 
		
		var v = Math.sqrt(vx * vx + vy * vy + vz * vz);
		
		var ax = -dragCoef * vx * v + this.m * B * (this.omegay * vz - this.omegaz * vy);
		var ay = -dragCoef * vy * v + this.m * B * (this.omegaz * vx - this.omegax * vz) - this.m * g;
		var az = -dragCoef * vz * v + this.m * B * (this.omegax * vy - this.omegay * vx);

		return [ax, ay, az];
    };
        
	this.updateVelocity = function() {
		this.vel = [this.vx, this.vy, this.vz];
	};
	
	this.restart = function() {
	    this.pos = [-2, 0, 0];
		this.vel = [this.vx, this.vy, this.vz];
		
		for (var i = 0 ; i < TRAJECTORY_BUFFER + 1 ; i++) {
			this.trajectory[i] = this.pos;
		}

		this.view.update(this.pos, this.trajectory);
	};

    this.move = function() {				
		
		if (this.pos[1] >= -0.001) {
			this.stateVector = this.integrator.integrate(this);

			this.pos = this.stateVector[0];
			this.vel = this.stateVector[1];
			
			this.vx = this.vel[0];
			this.vy = this.vel[1];
			this.vz = this.vel[2];

			for (var i = 0 ; i < TRAJECTORY_BUFFER ; i++) {
				this.trajectory[i] = this.trajectory[i + 1];
			}
				
			this.trajectory[TRAJECTORY_BUFFER] = this.pos;
						
			this.view.update(this.pos, this.trajectory);
		}
		
    };
    
}


function RK4Integrator(dt) {
	
	this.dt = dt;

    this.integrate = function(model) {
        var x1 = [], x2 = [], x3 = [], x4 = [];
        var v1 = [], v2 = [], v3 = [], v4 = [];
        var a1 = [], a2 = [], a3 = [], a4 = [];

        x1 = model.pos;        
        v1 = model.vel;
        a1 = model.accel(v1);

        x2 = [x1[0] + 0.5 * v1[0] * dt, 
			  x1[1] + 0.5 * v1[1] * dt, 
              x1[2] + 0.5 * v1[2] * dt];
              
        v2 = [v1[0] + 0.5 * a1[0] * dt, 
              v1[1] + 0.5 * a1[1] * dt,
              v1[2] + 0.5 * a1[2] * dt];
              
        a2 = model.accel(v2);
    
        x3= [x1[0] + 0.5 * v2[0] * dt,
             x1[1] + 0.5 * v2[1] * dt,
             x1[2] + 0.5 * v2[2] * dt];
             
        v3= [v1[0] + 0.5 * a2[0] * dt,
			 v1[1] + 0.5 * a2[1] * dt,
			 v1[2] + 0.5 * a2[2] * dt];
			 
        a3 = model.accel(v3);
    
        x4 = [x1[0] + v3[0] * dt,
              x1[1] + v3[1] * dt,
              x1[2] + v3[2] * dt];
              
        v4 = [v1[0] + a3[0] * dt,
              v1[1] + a3[1] * dt,
              v1[2] + a3[2] * dt];
              
        a4 = model.accel(v4);
              
        var pos = [x1[0] + (dt / 6.0) * (v1[0] + 2 * v2[0] + 2 * v3[0] + v4[0]),
                   x1[1] + (dt / 6.0) * (v1[1] + 2 * v2[1] + 2 * v3[1] + v4[1]),
                   x1[2] + (dt / 6.0) * (v1[2] + 2 * v2[2] + 2 * v3[2] + v4[2])];
                   
        var vel = [v1[0] + (dt / 6.0) * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]),
                   v1[1] + (dt / 6.0) * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]),
                   v1[2] + (dt / 6.0) * (a1[2] + 2 * a2[2] + 2 * a3[2] + a4[2])];                
                
        return [pos, vel];
    };
        
}



