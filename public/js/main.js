////////////////////////////////////////////////////////////////////////////////
// three.js scene
////////////////////////////////////////////////////////////////////////////////

import * as THREE from 'https://threejs.org/build/three.module.js';
import { ARButton } from 'https://threejs.org/examples/jsm/webxr/ARButton.js';

class Scene {
	constructor(_width, _height, _socket) {

		this.container = document.createElement('div');
		document.body.appendChild(this.container);

		// socket to communicate with the server
		this.socket = _socket;

		// utility
		this.width = _width;
		this.height = _height;

		// scene
		this.scene = new THREE.Scene();

		// camera
		this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 100);
		this.scene.add(this.camera);

		// light
		const light = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
		light.position.set(0.5, 1, 0.25);
		this.scene.add(light);

		// renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.width, this.height);
		this.renderer.xr.enabled = true;

		// push the canvas to the DOM
		this.container.appendChild(this.renderer.domElement);

		// AR button
		document.body.appendChild(ARButton.createButton(this.renderer));

		// controller
		const geometry = new THREE.CylinderBufferGeometry(0, 0.05, 0.2, 32).rotateX(Math.PI / 2);

		function onSelect() {
			const material = new THREE.MeshPhongMaterial({ color: 0xffffff * Math.random() });
			const mesh = new THREE.Mesh(geometry, material);
			mesh.position.set(0, 0, - 0.3).applyMatrix4(controller.matrixWorld);
			mesh.quaternion.setFromRotationMatrix(controller.matrixWorld);
			this.scene.add(mesh);
		}
		this.controller = this.renderer.xr.getController(0);
		this.controller.addEventListener('select', onSelect);
		this.scene.add(this.controller);

		// event listeners
		window.addEventListener("resize", () => {
			this.width = window.innerWidth;
			this.height = window.innerHeight;
			this.renderer.setSize(this.width, this.height);
			this.camera.aspect = this.width / this.height;
			this.camera.updateProjectionMatrix();
		});

		// add player
		// this.addSelf();

		

		// start the loop
		this.renderer.setAnimationLoop((time) => this.update(time));
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Clients

	addSelf() {
		// // color
		// const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x9797CE });

		// // player
		// const player = new THREE.Mesh(new THREE.CubeGeometry(1, 1, 1), playerMaterial);

		// // add player to scene
		// this.scene.add(player);
	}

	addClient(_clientProp, _id) {
		// // color
		// const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x9797CE });

		// // player
		// const player = new THREE.Mesh(new THREE.CubeGeometry(1, 1, 1), playerMaterial);

		// // add player to scene
		// this.scene.add(player);

		// // assign to client
		// clients[_id].player = player;
	}

	removeClient(_id) {
		// // remove player from scene
		// this.scene.remove(clients[_id].player);
	}

	updateClientMoves(_clientProps) {
		for (let _id in _clientProps) {
			if (_id != id) {
				const lerpAmount = 0.2;
				const playerPosition = new THREE.Vector3().fromArray(_clientProps[_id].position);
				const playerQuaternion = new THREE.Quaternion().fromArray(_clientProps[_id].quaternion);
				clients[_id].player.position.lerp(playerPosition, lerpAmount);
				clients[_id].player.quaternion.slerp(playerQuaternion, lerpAmount);
			}
		}
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Interaction

	// data to send to the server
	getPlayerMove() {
		return [
			[this.player.position.x, this.player.position.y, this.player.position.z],
			[this.player.quaternion.x, this.player.quaternion.y, this.player.quaternion.z, this.player.quaternion.w]
		];
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Rendering
	update(time) {
		// send movement to server to update clients data (calls back updateClientMoves)
		//this.socket.emit('move', this.getPlayerMove());

		// render
		this.renderer.render(this.scene, this.camera);
	}
	
}

////////////////////////////////////////////////////////////////////////////////
// global variables
////////////////////////////////////////////////////////////////////////////////

// socket.io
let socket;
let id; //my socket id

// array of connected clients
let clients = {};

// variable to store our three.js scene:
let glScene;

////////////////////////////////////////////////////////////////////////////////
// socket.io
////////////////////////////////////////////////////////////////////////////////

// add client object
function addClient(_clientProp, _id) {
	console.log("Adding client with id " + _id);
	clients[_id] = {};
	glScene.addClient(_clientProp, _id);
}

// remove client object
function removeClient(_id) {
	console.log('A user disconnected with the id: ' + _id);
	glScene.removeClient(_id);
	delete clients[_id];
}

// establishes socket connection
function initSocketConnection() {
	socket = io();
	socket.on('connect', () => { });

	// on connection, server sends clients, his ID, and a list of all keys
	socket.on('introduction', (_clientProps, _id, _ids) => {
		// keep a local copy of my ID:
		console.log('My socket ID is: ' + _id);
		id = _id;

		// for each existing user, add them as a client
		for (let i = 0; i < _ids.length; i++) {
			if (_ids[i] != id) { // add all existing clients except for myself
				addClient(_clientProps[_ids[i]], _ids[i]);
			}
		}
	});

	// when a new user has entered the server
	socket.on('newUserConnected', (_clientProp, clientCount, _id) => {
		console.log(clientCount + ' clients connected');
		let alreadyHasUser = false;
		for (let i = 0; i < Object.keys(clients).length; i++) {
			if (Object.keys(clients)[i] == _id) {
				alreadyHasUser = true;
				break;
			}
		}
		if (_id != id && !alreadyHasUser) {
			console.log('A new user connected with the id: ' + _id);
			addClient(_clientProp, _id); //add the new client with its id
		}
	});

	socket.on('userDisconnected', (_id) => {
		if (_id != id) {
			removeClient(_id);
		}
	});

	// update when one of the users moves in space
	socket.on('userMoves', _clientProps => {
		glScene.updateClientMoves(_clientProps);
	});
}

////////////////////////////////////////////////////////////////////////////////
// three.js
////////////////////////////////////////////////////////////////////////////////

function createScene() {
	// initialize three.js scene
	console.log("Creating three.js scene...");
	glScene = new Scene( window.innerWidth,window.innerHeight,socket);
}

////////////////////////////////////////////////////////////////////////////////
// start-up
////////////////////////////////////////////////////////////////////////////////

window.onload = async () => {

	// initialize socket connection
	initSocketConnection();

	// finally create the threejs scene
	createScene();
};