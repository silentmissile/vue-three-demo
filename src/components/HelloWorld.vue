<template>
  <div id='three-container'></div>
</template>

<script>
// import * as THREE from 'three'
import { THREE } from '../ThreeControls'
export default {
  name: 'three-container',
  data () {
    return {
      camera: new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000),
      scene: new THREE.Scene(),
      renderer: new THREE.WebGLRenderer({ antialias: true }),
      light: new THREE.SpotLight(0xffffff, 1.5),
      splineHelperObjects: [],
      splinePointsLength: 4,
      positions: [],
      point: new THREE.Vector3(),
      options: {},

      geometry: null, // new THREE.BoxBufferGeometry(20, 20, 20),
      controls: null,
      transformControl: null, // new THREE.TransformControls(camera, renderer.domElement),
      dragcontrols: null,

      ARC_SEGMENTS: 200,

      splines: {},

      params: {
        uniform: true,
        tension: 0.5,
        centripetal: true,
        chordal: true,
        addPoint: this.addPoint,
        removePoint: this.removePoint,
        exportSpline: this.exportSpline
      },
      hiding: null
    }
  },
  mounted () {
    this.scene.background = new THREE.Color(0xf0f0f0)

    this.camera.position.set(0, 250, 1000)
    this.scene.add(this.camera)

    this.scene.add(new THREE.AmbientLight(0xf0f0f0))

    this.light.position.set(0, 1500, 200)
    this.light.castShadow = true
    this.light.shadow = new THREE.LightShadow(
      new THREE.PerspectiveCamera(70, 1, 200, 2000)
    )
    this.light.shadow.bias = -0.000222
    this.light.shadow.mapSize.width = 1024
    this.light.shadow.mapSize.height = 1024
    this.scene.add(this.light)

    let planeGeometry = new THREE.PlaneBufferGeometry(2000, 2000)
    planeGeometry.rotateX(-Math.PI / 2)
    let planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 })

    let plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.position.y = -200
    plane.receiveShadow = true
    this.scene.add(plane)

    let helper = new THREE.GridHelper(2000, 100)
    helper.position.y = -199
    helper.material.opacity = 0.25
    helper.material.transparent = true
    this.scene.add(helper)

    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.$el.appendChild(this.renderer.domElement)

    // Controls
    // OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement)
    this.controls.damping = 0.2
    this.controls.addEventListener('change', this.render)

    this.controls.addEventListener('start', () => {
      this.cancelHideTransform()
    })

    this.controls.addEventListener('end', () => {
      this.delayHideTransform()
    })
    // TransformControls
    this.transformControl = new THREE.TransformControls(this.camera, this.renderer.domElement)
    this.transformControl.addEventListener('change', (e) => {
      this.render()
    })
    this.transformControl.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value
    })
    this.scene.add(this.transformControl)
    // Hiding transform situation is a little in a mess :()
    this.transformControl.addEventListener('change', (e) => {
      this.cancelHideTransform()
    })

    this.transformControl.addEventListener('mouseDown', (e) => {
      this.cancelHideTransform()
    })

    this.transformControl.addEventListener('mouseUp', (e) => {
      this.delayHideTransform()
    })

    this.transformControl.addEventListener('objectChange', (e) => {
      this.updateSplineOutline()
    })
    // DragControls
    this.dragcontrols = new THREE.DragControls(this.splineHelperObjects, this.camera, this.renderer.domElement) //
    this.dragcontrols.enabled = false
    this.dragcontrols.addEventListener('hoveron', (event) => {
      this.transformControl.attach(event.object)
      this.cancelHideTransform()
    })
    this.dragcontrols.addEventListener('hoveroff', (event) => {
      this.delayHideTransform()
    })

    /*******
    * Curves
    *********/
    this.positions = [ new THREE.Vector3(289.76843686945404, 452.51481137238443, 56.10018915737797),
      new THREE.Vector3(-53.56300074753207, 171.49711742836848, -14.495472686253045),
      new THREE.Vector3(-91.40118730204415, 176.4306956436485, -6.958271935582161),
      new THREE.Vector3(-383.785318791128, 491.1365363371675, 47.869296953772746) ]
    this.splines = {}
    this.splinePointsLength = this.positions.length
    for (let i = 0; i < this.splinePointsLength; i++) {
      this.addSplineObject(this.positions[ i ])
    }

    this.positions = []

    for (let i = 0; i < this.splinePointsLength; i++) {
      this.positions.push(this.splineHelperObjects[ i ].position)
    }
    this.geometry = new THREE.BufferGeometry()
    this.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(this.ARC_SEGMENTS * 3), 3))

    let curve = new THREE.CatmullRomCurve3(this.positions)
    curve.curveType = 'catmullrom'
    curve.mesh = new THREE.Line(this.geometry.clone(), new THREE.LineBasicMaterial({
      color: 0xff0000,
      opacity: 0.35
    }))
    curve.mesh.castShadow = true
    this.splines.uniform = curve

    curve = new THREE.CatmullRomCurve3(this.positions)
    curve.curveType = 'centripetal'
    curve.mesh = new THREE.Line(this.geometry.clone(), new THREE.LineBasicMaterial({
      color: 0x00ff00,
      opacity: 0.35
    }))
    curve.mesh.castShadow = true
    this.splines.centripetal = curve

    curve = new THREE.CatmullRomCurve3(this.positions)
    curve.curveType = 'chordal'
    curve.mesh = new THREE.Line(this.geometry.clone(), new THREE.LineBasicMaterial({
      color: 0x0000ff,
      opacity: 0.35
    }))
    curve.mesh.castShadow = true
    this.splines.chordal = curve

    for (let k in this.splines) {
      this.scene.add(this.splines[ k ].mesh)
    }
    this.updateSplineOutline()
    this.render()
  },
  methods: {
    addSplineObject (position) {
      let material = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff })
      let object = new THREE.Mesh(new THREE.BoxBufferGeometry(20, 20, 20), material)

      if (position) {
        object.position.copy(position)
      } else {
        object.position.x = Math.random() * 1000 - 500
        object.position.y = Math.random() * 600
        object.position.z = Math.random() * 800 - 400
      }

      object.castShadow = true
      object.receiveShadow = true
      this.scene.add(object)
      this.splineHelperObjects.push(object)
      return object
    },
    addPoint () {
      this.splinePointsLength++
      this.positions.push(this.addSplineObject().position)
      this.updateSplineOutline()
    },
    removePoint () {
      if (this.splinePointsLength <= 4) {
        return
      }
      this.splinePointsLength--
      this.positions.pop()
      this.scene.remove(this.splineHelperObjects.pop())

      this.updateSplineOutline()
    },
    exportSpline () {
      let strplace = []

      for (let i = 0; i < this.splinePointsLength; i++) {
        let p = this.splineHelperObjects[ i ].position
        strplace.push('new THREE.Vector3({0}, {1}, {2})'.format(p.x, p.y, p.z))
      }

      console.log(strplace.join(',\n'))
      let code = '[' + (strplace.join(',\n\t')) + ']'
      prompt('copy and paste code', code)
    },
    updateSplineOutline () {
      for (let k in this.splines) {
        let spline = this.splines[ k ]
        let splineMesh = spline.mesh
        let position = splineMesh.geometry.attributes.position
        for (let i = 0; i < this.ARC_SEGMENTS; i++) {
          let t = i / (this.ARC_SEGMENTS - 1)
          spline.getPoint(t, this.point)
          position.setXYZ(i, this.point.x, this.point.y, this.point.z)
        }
        position.needsUpdate = true
      }
    },
    render () {
      this.splines.uniform.mesh.visible = this.params.uniform
      this.splines.centripetal.mesh.visible = this.params.centripetal
      this.splines.chordal.mesh.visible = this.params.chordal
      this.renderer.render(this.scene, this.camera)
      requestAnimationFrame(this.render)
    },
    delayHideTransform () {
      this.cancelHideTransform()
      this.hideTransform()
    },
    hideTransform () {
      this.hiding = setTimeout(() => {
        this.transformControl.detach(this.transformControl.object)
      }, 500)
    },
    cancelHideTransform () {
      if (this.hiding) clearTimeout(this.hiding)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#three-container {
  position: absolute;
  top: 0px;
  left: 0px;
  padding: 0px
}
</style>
