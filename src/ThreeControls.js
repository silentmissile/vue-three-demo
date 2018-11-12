/*
this file simply require all following files from three.js project
https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/OrbitControls.js
https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/TransformControls.js
https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/DragControls.js
and combine all of them
*/
const THREE = Object.assign({}, require('three'), require('./controls/OrbitControls.js'), require('./controls/TransformControls.js'), require('./controls/DragControls.js'))

export { THREE }
