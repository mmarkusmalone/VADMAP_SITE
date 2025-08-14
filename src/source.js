import * as THREE from 'three';
// GLTFLoader is not used, so its import can be removed if not planned for future use.
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { depth } from 'three/tsl';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const scene = new THREE.Scene();
const journalProcessedData = {};
const journalUnprocessedData = {};

Promise.all([
  fetch('/processed.json').then(res => res.json()),
  fetch('/unprocessed.json').then(res => res.json())
]).then(([processed, unprocessed]) => {
  // Build journalProcessedData
  processed.entries_processed.forEach(entry => {
    journalProcessedData[entry.date] = entry.text;
  });

  // Build journalUnprocessed
  unprocessed.entries_unprocessed.forEach(entry => {
    journalUnprocessedData[entry.date] = entry.text;
  });

  // Populate the app with dynamic data
  setupJournalInterface(journalUnprocessedData);
  displayJournalDataPoints(journalProcessedData);
});

// need to save journak unprocessed and processed
// --- Create EXR Environment Background ---
// IMPORTANT: Replace 'your_skybox_file.exr' with the actual filename of your .exr file.
// Ensure this path is correct relative to your HTML file.
new EXRLoader()
    .setPath('/') // Path to the directory containing your .exr file
    .load('background.exr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture; // Crucial for PBR materials to reflect the environment
    },
    // onProgress callback (optional)
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    // onError callback (optional)
    function (error) {
        console.error('An error happened while loading the EXR file:', error);
    });


const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Recommended for HDR .exr files
renderer.toneMappingExposure = 1.0; // Adjust exposure as needed
document.body.appendChild( renderer.domElement );

// --- Group for Data Points ---
const dataPointsGroup = new THREE.Group();
scene.add(dataPointsGroup); // Add data points as children of the cube frame
// --- End Cube Frame ---





// --- End Cube Frame ---

// --- Tooltip Element ---
const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.visibility = 'hidden'; // Start hidden
tooltip.style.padding = '8px';
tooltip.style.background = 'rgba(0, 0, 0, 0.75)';
tooltip.style.color = 'white';
tooltip.style.borderRadius = '4px';
tooltip.style.pointerEvents = 'none'; // So it doesn't interfere with mouse events on the canvas
document.body.appendChild(tooltip);

camera.position.z = 2;

// Variables for click-and-drag interaction
let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
const rotationSpeed = 0.005; // Adjust this value to control rotation sensitivity

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const zoomSpeed = 0.001; // Adjust this value for zoom sensitivity



function createGradientAxis(start, end, colorStart, colorEnd, segments = 20) {
    const positions = [];
    const colors = [];

    const colorA = new THREE.Color(colorStart);
    const colorB = new THREE.Color(colorEnd);

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;

        // Position interpolation
        const point = new THREE.Vector3().lerpVectors(start, end, t);
        positions.push(point.x, point.y, point.z);

        // Color interpolation
        const color = new THREE.Color().lerpColors(colorA, colorB, t);
        colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({ vertexColors: true });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
}

const axisLength = 2;
createGradientAxis(new THREE.Vector3(-axisLength, 0, 0), new THREE.Vector3(axisLength, 0, 0), 'green', 'yellow');      // Valence
createGradientAxis(new THREE.Vector3(0, -axisLength, 0), new THREE.Vector3(0, axisLength, 0), 'blue', 'red');   // Arousal
createGradientAxis(new THREE.Vector3(0, 0, -axisLength), new THREE.Vector3(0, 0, axisLength), 'purple', 'orange');  // Dominance


const miniAxes = new THREE.AxesHelper(0.1);
miniAxes.position.set(-0.6, -0.6, -0.6);
scene.add(miniAxes);

// --- Function to Display Journal Data Points ---
function displayJournalDataPoints(data) {
    // Clear existing points if any (e.g., if data is updated)
    while (dataPointsGroup.children.length > 0) {
        dataPointsGroup.remove(dataPointsGroup.children[0]);
    }

    const pointGeometry = new THREE.SphereGeometry(0.02, 16, 16); // Small sphere for each point

    for (const date in data) {
        const dayEntries = data[date];
        let previousPointData = null; // 🔄 Reset for each journal entry (date)

        for (const text in dayEntries) {
            const vad = dayEntries[text]; // [Valence, Arousal, Dominance]
            if (vad && vad.length === 3) {
                // Determine color based on Valence (vad[0]) for a heatmap effect
                const valence = vad[0];
                const normalizedValence = (valence + 1) / 2; // Normalize to 0-1 range

                const sphereColor = new THREE.Color();
                if (normalizedValence < 0.5) {
                    const t = normalizedValence / 0.5;
                    sphereColor.setRGB(0, t, 1 - t); // Blue → Green
                } else {
                    const t = (normalizedValence - 0.5) / 0.5;
                    sphereColor.setRGB(t, 1 - t, 0); // Green → Red
                }

                const pointMaterial = new THREE.MeshStandardMaterial({
                    color: sphereColor,
                    metalness: 0.8,
                    roughness: 0.2
                });

                const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
                const currentPointPosition = new THREE.Vector3(
                    vad[0] * (axisLength / 2),
                    vad[1] * (axisLength / 2),
                    vad[2] * (axisLength / 2)
                );

                pointMesh.position.copy(currentPointPosition);
                pointMesh.userData = { text: text, isDataPoint: true };
                dataPointsGroup.add(pointMesh);

                // Draw line *only if it's the same journal entry (i.e. same date)*
                if (previousPointData) {
                    const lineColor = new THREE.Color()
                        .addColors(previousPointData.color, sphereColor)
                        .multiplyScalar(0.5);

                    const lineMaterial = new THREE.LineBasicMaterial({ color: lineColor, linewidth: 1 });
                    const points = [previousPointData.position, currentPointPosition];
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(lineGeometry, lineMaterial);
                    dataPointsGroup.add(line);
                }

                // Update previous point for this date group
                previousPointData = {
                    position: currentPointPosition.clone(),
                    color: sphereColor.clone()
                };
            }
        }
    }
}

// --- Create 3D Axis Labels ---
const textMeshes = [];
const fontLoader = new FontLoader();
fontLoader.load('src/fonts/helvetiker_regular.typeface.json', function (font) {
    const textMaterial = new THREE.MeshPhysicalMaterial({
        color: '#3b51a3',
        metalness: 1.0,
        roughness: 0.05,
        reflectivity: 1.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0
    });
    const params = { font, size: 0.05, depth: 0.005, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.001 };

    function addText(text, position) {
        const geometry = new TextGeometry(text, params);
        geometry.center();
        const mesh = new THREE.Mesh(geometry, textMaterial);
        mesh.position.copy(position);
        scene.add(mesh);
        textMeshes.push(mesh);
    }

    addText('Valence', new THREE.Vector3(1.5, 0, 0));
    addText('Arousal', new THREE.Vector3(0, 1.2, 0));
    addText('Dominance', new THREE.Vector3(0, 0, 1.5));
});

const dirLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
dirLight.position.set( 0, 0, 1 ).normalize();
scene.add( dirLight );

const pointLight = new THREE.PointLight( 0xffffff, 4.5, 0, 0 );
pointLight.color.setHSL( Math.random(), 1, 0.5 );
pointLight.position.set( 0, 100, 90 );
scene.add( pointLight );


// Mouse Down: Start dragging
window.addEventListener('mousedown', (event) => {
    // Check if it's the left mouse button (button code 0)
    if (event.button === 0) {
        isDragging = true;
        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }
});

// Mouse Move: Rotate cube if dragging
window.addEventListener('mousemove', (event) => {
    // Update mouse coordinates for raycasting (normalized -1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    if (isDragging) {
        const deltaX = event.clientX - previousMouseX;
        const deltaY = event.clientY - previousMouseY;

        // Instead of rotating the cubeFrame, rotate the camera around the cubeFrame's origin (0,0,0)
        const radius = camera.position.length();

        // Calculate current spherical coordinates of the camera
        // theta: azimuthal angle around Y-axis (from positive Z-axis)
        let theta = Math.atan2(camera.position.x, camera.position.z);
        // phi: polar angle from positive Y-axis
        let phi = Math.acos(camera.position.y / radius);

        // Adjust angles based on mouse movement
        theta -= deltaX * rotationSpeed; // Horizontal drag rotates camera around Y (reversed)
        phi -= deltaY * rotationSpeed;   // Vertical drag rotates camera around X (tilts up/down)

        // Clamp phi to prevent flipping at the poles
        const epsilon = 0.0001; // Small value to avoid issues at exact poles
        phi = Math.max(epsilon, Math.min(Math.PI - epsilon, phi));

        // Convert spherical coordinates back to Cartesian for camera position
        camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.cos(theta);

        camera.lookAt(new THREE.Vector3(0, 0, 0)); // Ensure camera always looks at the origin (center of the cube)

        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }

    // Hover detection for data points
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(dataPointsGroup.children, false);

    // Find the first intersected object that is a data point (a sphere), ignoring the lines.
    const intersectedPoint = intersects.find(intersect => intersect.object.userData.isDataPoint);

    if (intersectedPoint) {
        const intersectedObject = intersectedPoint.object;
        tooltip.innerHTML = intersectedObject.userData.text;
        tooltip.style.visibility = 'visible';

        // Convert 3D position to 2D screen position for tooltip
        const vector = new THREE.Vector3();
        intersectedObject.getWorldPosition(vector); // Get world position of the data point sphere
        vector.project(camera); // Project to normalized device coordinates

        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;

        tooltip.style.left = `${x + 10}px`; // Offset slightly from cursor
        tooltip.style.top = `${y + 10}px`;
    } else {
        tooltip.style.visibility = 'hidden';
    }
});

// Mouse Up: Stop dragging
window.addEventListener('mouseup', (event) => {
    if (event.button === 0) { // Ensure it's the left mouse button being released
        isDragging = false;
    }
});

window.addEventListener('mouseleave', (event) => {
    // If the mouse leaves the window while dragging, stop dragging
    if (isDragging) {
        isDragging = false;
    }
});

window.addEventListener('wheel', (event) => {
    event.preventDefault(); // Prevent default page scrolling

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(dataPointsGroup.children); // Intersect with the cube frame

    let targetPoint;
    if (intersects.length > 0) {
        // If ray intersects the cube, zoom towards the intersection point
        targetPoint = intersects[0].point;
    } else {
        // If ray doesn't intersect anything, zoom towards the origin as a fallback
        targetPoint = new THREE.Vector3(0, 0, 0);
    }

    // Calculate the vector from the camera to the target point
    const vector = new THREE.Vector3().subVectors(targetPoint, camera.position);

    // Determine zoom amount based on wheel delta
    // event.deltaY is typically negative when scrolling up (zoom in) and positive when scrolling down (zoom out)
    const zoomAmount = event.deltaY * zoomSpeed; // Adjust zoomSpeed

    // Move the camera along the vector towards/away from the target point
    camera.position.addScaledVector(vector, zoomAmount);

    // No need to call render() here, as setAnimationLoop will call animate() which renders
});


// Handle window resizing
window.addEventListener('resize', () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    textMeshes.forEach(mesh => mesh.lookAt(camera.position));
    //iconMeshes.forEach(mesh => mesh.lookAt(camera.position));
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);


function setupJournalInterface(journalData) {
  const viewModal = document.getElementById('view-journal-modal');
  const journalEntryModal = document.getElementById('journal-entry-modal');

  const openBtn = document.getElementById('view-journal-button'); 
  const closeViewBtn = viewModal.querySelector('.close-button');
  const closeEntryBtn = document.getElementById('journal-entry-close');

  const listContainer = document.getElementById('journal-list-container');
  const modalDate = document.getElementById('journal-entry-date');
  const modalText = document.getElementById('journal-entry-text');

  // Clear list container if setup is run again
  listContainer.innerHTML = '';

  // Create date buttons that trigger entry view modal
  for (const date in journalData) {
    const dateButton = document.createElement('button');
    dateButton.classList.add('journal-button');
    dateButton.textContent = date;

    dateButton.addEventListener('click', () => {
      modalDate.textContent = date;
      modalText.textContent = journalData[date];
      journalEntryModal.style.display = 'flex'; // Show entry modal
    });

    listContainer.appendChild(dateButton);
  }

  // Show journal date picker modal
  openBtn.addEventListener('click', () => {
    viewModal.style.display = 'flex';
  });

  // Close date picker modal
  closeViewBtn.addEventListener('click', () => {
    viewModal.style.display = 'none';
  });

  // Close entry view modal
  closeEntryBtn.addEventListener('click', () => {
    journalEntryModal.style.display = 'none';
    modalDate.textContent = '';
    modalText.textContent = '';
  });

  // Click-outside-to-close for both modals
  window.addEventListener('click', (event) => {
    if (event.target === viewModal) {
      viewModal.style.display = 'none';
    } else if (event.target === journalEntryModal) {
      journalEntryModal.style.display = 'none';
      modalDate.textContent = '';
      modalText.textContent = '';
    }
  });
}

// Call the function to build the UI from the unprocessed journal data
// setupJournalInterface(journalUnprocessed);

// // Initial display of data points
// displayJournalDataPoints(journalProcessedData);

renderer.setAnimationLoop( animate );

// Add this code to your /Users/mayamarkus-malone/Documents/VADMAP/src/source.js file

// This code handles the logic for the new pop-up modal.
document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const filterButton = document.getElementById('filter-button');
  const filterMenu = document.getElementById('filter-menu');

  const keywordInput = document.getElementById('keyword-filter');
  const dateMin = document.getElementById('date-min');
  const dateMax = document.getElementById('date-max');

  const valMin = document.getElementById('valence-min');
  const valMax = document.getElementById('valence-max');
  const arMin = document.getElementById('arousal-min');
  const arMax = document.getElementById('arousal-max');
  const domMin = document.getElementById('dominance-min');
  const domMax = document.getElementById('dominance-max');

  const applyButton = document.getElementById('apply-filters');
  const clearButton = document.getElementById('clear-filters'); // optional
  const activeFiltersContainer = document.getElementById('active-filters');

  // Journal entry modal (already working)
  const modal = document.getElementById('entry-modal');
  const openBtn = document.getElementById('add-entry-button');
  const closeBtn = document.querySelector('#entry-modal .close-button');
  const submitBtn = document.getElementById('submit-button');

  // Toggle modal
  openBtn.addEventListener('click', () => modal.style.display = 'flex');
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  submitBtn.addEventListener('click', () => {
    const dateInput = document.getElementById('new-entry-date');
    const textInput = document.getElementById('new-entry-text');

    const date = dateInput.value;
    const text = textInput.value.trim();

    if (!date || !text) {
        alert("Please enter both date and text.");
        return;
    }

    // 1. Build new unprocessed entry
    const newUnprocessedEntry = {
        date: date,
        text: text
    };

    // For now: console output (because browser can't write to local JSON files)
    console.log("📥 New Unprocessed Entry:", JSON.stringify(newUnprocessedEntry, null, 2));
    fetch('http://127.0.0.1:5050/api/save-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unprocessed: newUnprocessedEntry })
        })
        .then(res => res.json())
        .then(data => {
        if (data.processed) {
            const { date, text } = data.processed;
            if (!journalProcessedData[date]) journalProcessedData[date] = {};

            // Add all chunks
            for (const chunk in text) {
            journalProcessedData[date][chunk] = text[chunk];
            }

            displayJournalDataPoints(journalProcessedData);
        }

        modal.style.display = 'none';
        })
        .catch(err => {
        console.error("Error saving entry:", err);
    });


    // Refresh visualization
    // displayJournalDataPoints(journalProcessedData);

    // Clear input fields and close modal
    dateInput.value = '';
    textInput.value = '';
    modal.style.display = 'none';
    });

  // Toggle filter dropdown
  filterButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = filterMenu.style.display === 'block';
    filterMenu.style.display = isVisible ? 'none' : 'block';
  });

  window.addEventListener('click', (event) => {
    if (event.target === modal) modal.style.display = 'none';
    const isClickInside = filterMenu.contains(event.target) || filterButton.contains(event.target);
    if (!isClickInside) filterMenu.style.display = 'none';
  });

  // --- Filter Logic ---

  let appliedFilters = {};

  function renderActiveFilters() {
    activeFiltersContainer.innerHTML = '';
    Object.entries(appliedFilters).forEach(([key, value]) => {
      const tag = document.createElement('div');
      tag.className = 'filter-tag';
      tag.innerHTML = `${key}: ${value} <button data-key="${key}">&times;</button>`;
      activeFiltersContainer.appendChild(tag);
    });

    activeFiltersContainer.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        delete appliedFilters[key];
        reapplyFilters();
      });
    });
  }

  function reapplyFilters() {
    if (!appliedFilters['Keyword']) keywordInput.value = '';
    if (!appliedFilters['Date Range']) {
      dateMin.selectedIndex = 0;
      dateMax.selectedIndex = dateMax.length - 1;
    }
    if (!appliedFilters['Valence']) {
      valMin.value = -1;
      valMax.value = 1;
    }
    if (!appliedFilters['Arousal']) {
      arMin.value = -1;
      arMax.value = 1;
    }
    if (!appliedFilters['Dominance']) {
      domMin.value = -1;
      domMax.value = 1;
    }

    applyFilters(); // Reapply filter logic
  }

  function applyFilters() {
    const keyword = keywordInput.value.trim().toLowerCase();
    const dateStart = dateMin.value;
    const dateEnd = dateMax.value;
    const vMin = parseFloat(valMin.value);
    const vMax = parseFloat(valMax.value);
    const aMin = parseFloat(arMin.value);
    const aMax = parseFloat(arMax.value);
    const dMin = parseFloat(domMin.value);
    const dMax = parseFloat(domMax.value);

    // Track applied filter labels
    appliedFilters = {};
    if (keyword) appliedFilters['Keyword'] = keyword;
    if (dateStart !== dateMin.options[0].value || dateEnd !== dateMax.options[dateMax.length - 1].value)
      appliedFilters['Date Range'] = `${dateStart} → ${dateEnd}`;
    if (vMin > -1 || vMax < 1) appliedFilters['Valence'] = `${vMin} to ${vMax}`;
    if (aMin > -1 || aMax < 1) appliedFilters['Arousal'] = `${aMin} to ${aMax}`;
    if (dMin > -1 || dMax < 1) appliedFilters['Dominance'] = `${dMin} to ${dMax}`;

    renderActiveFilters();

    // Apply filtering logic
    const filtered = {};
    const entries = getAllEntries(); // You defined this inside the DOMContentLoaded block

    entries.forEach(({ date, text, vad }) => {
      if (date < dateStart || date > dateEnd) return;
      if (keyword && !text.toLowerCase().includes(keyword)) return;
      const [v, a, d] = vad;
      if (v < vMin || v > vMax || a < aMin || a > aMax || d < dMin || d > dMax) return;

      if (!filtered[date]) filtered[date] = {};
      filtered[date][text] = vad;
    });

    displayJournalDataPoints(filtered);
    setupJournalInterface(journalUnprocessedData);
  }

  applyButton.addEventListener('click', applyFilters);

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      keywordInput.value = '';
      dateMin.selectedIndex = 0;
      dateMax.selectedIndex = dateMax.length - 1;
      valMin.value = -1;
      valMax.value = 1;
      arMin.value = -1;
      arMax.value = 1;
      domMin.value = -1;
      domMax.value = 1;
      appliedFilters = {};
      renderActiveFilters();
      displayJournalDataPoints(journalProcessedData); // Reset to show all
    });
  }

  // --- Populate Date Dropdowns (call only after journalProcessedData is ready) ---
  const waitForData = setInterval(() => {
    if (Object.keys(journalProcessedData).length > 0) {
      clearInterval(waitForData);
      const dates = Object.keys(journalProcessedData).sort();
      dates.forEach(date => {
        const opt1 = document.createElement('option');
        const opt2 = document.createElement('option');
        opt1.value = opt1.text = date;
        opt2.value = opt2.text = date;
        dateMin.appendChild(opt1);
        dateMax.appendChild(opt2);
      });
      dateMin.selectedIndex = 0;
      dateMax.selectedIndex = dateMax.length - 1;
    }
  }, 100);

  // Helper to flatten journalProcessedData into an array of entries
  function getAllEntries() {
    const entries = [];
    for (const date in journalProcessedData) {
      for (const text in journalProcessedData[date]) {
        entries.push({ date, text, vad: journalProcessedData[date][text] });
      }
    }
    return entries;
  }
});


const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
dirLight.intensity = 1.0;
pointLight.intensity = 1.5;