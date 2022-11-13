import * as THREE from 'three';
import vertexShader from 'vertexShader';
import fragmentShader from 'fragmentShader';
import sceneJson from './default.scene.json' assert { type: 'json' };

const width = sceneJson.resolution[0] ?? window.innerWidth;
const height = sceneJson.resolution[1] ?? window.innerHeight;
const aspectRatio = width / height;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

camera.position.z = 1;

// Get the canvas scaling based on fov
const fovRadians = (camera.fov * Math.PI) / 180;
const yFov = camera.position.z * Math.tan(fovRadians / 2) * 2;

// This is basically our canvas
const canvasGeometry = new THREE.PlaneGeometry(yFov * camera.aspect, yFov);
const canvasMaterial = new THREE.ShaderMaterial({
	uniforms: {
		uResolution: {
			value: new THREE.Vector2(width, height),
		},
		uCameraPosition: {
			value: new THREE.Vector3(0, 0, 0),
		},
		uMaxIterations: {
			value: sceneJson.maxIterations,
		},
		uStepSize: {
			value: sceneJson.stepSize,
		},
		uDiskInnerRadius: {
			value: sceneJson.diskInnerRadius,
		},
		uDiskOuterRadius: {
			value: sceneJson.diskOuterRadius,
		},
		uDiskTemperature: {
			value: sceneJson.diskTemperature,
		},
	},
	vertexShader,
	fragmentShader,
});

const canvasMesh = new THREE.Mesh(canvasGeometry, canvasMaterial);
scene.add(canvasMesh);

function lerp(start, end, t) {
	return start + (end - start) * t;
}

let frames = [];

sceneJson.path.forEach((path, i) => {
	for (let t = 0; t < 1; t += path.step) {
		const start = path.start ?? simulation.path[i - 1].end;
		const x = lerp(start[0], path.end[0], t);
		const y = lerp(start[1], path.end[1], t);
		const z = lerp(start[2], path.end[2], t);

		canvasMaterial.uniforms.uCameraPosition.value = new THREE.Vector3(
			x,
			y,
			z
		);
		renderer.render(scene, camera);

		const data = renderer.domElement.toDataURL('image/png');
		frames.push(data);
	}
});

for (let i = 0; i < frames.length; i++) {
	const image = new Image();
	image.src = frames[i];
	image.width = 100 * aspectRatio;
	image.height = 100;

	document.querySelector('.images').appendChild(image);
}

document
	.querySelector('.download-button')
	.addEventListener('click', async () => {
		// Save the frames to a zip

		const zip = new JSZip();
		const folder = zip.folder('images');

		for (const [i, frame] of frames.entries()) {
			const data = frame.replace(/^data:image\/\w+;base64,/, ''); // Strip base64 header
			folder.file(i.toString().padStart(4, '0') + '.png', data, {
				base64: true,
			});
		}

		const content = await zip.generateAsync({ type: 'blob' });
		saveAs(content, 'images.zip');
	});
