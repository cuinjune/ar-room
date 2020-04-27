class Scene {
	constructor(_domElement, _width, _height, _socket) {

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
		_domElement.append(this.renderer.domElement);

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
		this.renderer.setAnimationLoop(this.render);
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Clients

	addSelf() {
		// color
		const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x9797CE });

		// player
		const player = new THREE.Mesh(new THREE.CubeGeometry(1, 1, 1), playerMaterial);

		// add player to scene
		this.scene.add(player);
	}

	addClient(_clientProp, _id) {
		// color
		const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x9797CE });

		// player
		const player = new THREE.Mesh(new THREE.CubeGeometry(1, 1, 1), playerMaterial);

		// add player to scene
		this.scene.add(player);

		// assign to client
		clients[_id].player = player;
	}

	removeClient(_id) {
		// remove player from scene
		this.scene.remove(clients[_id].player);
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

	render() {
		// send movement to server to update clients data (calls back updateClientMoves)
		//this.socket.emit('move', this.getPlayerMove());

		// render
		this.renderer.render(this.scene, this.camera);
	}
}