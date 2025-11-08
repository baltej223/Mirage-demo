// modulepreload polyfill (same as original)
    import "https://ar-js-org.github.io/locar.js/assets/modulepreload-polyfill-B5Qt9EMX.js";

    // map minified exports to readable names using `as`
    import {
      P as PerspectiveCamera,
      W as WebGLRenderer,
      S as Scene,
      k as GpsEntityManager,
      b as CameraFeed,
      V as SensorController,
      B as BoxGeometry,
      M as Mesh,
      a as MeshBasicMaterial,
    } from "https://ar-js-org.github.io/locar.js/assets/locar.es-8YGvHcXJ.js";

    // ---- Equivalent logic from the original example, using readable names ----

    const camera = new PerspectiveCamera(
      80,
      window.innerWidth / window.innerHeight,
      0.001,
      1e3
    );

    const renderer = new WebGLRenderer({ canvas: document.getElementById("glscene") });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new Scene();
    const gpsManager = new GpsEntityManager(scene, camera);
    const cameraFeed = new CameraFeed({ video: { facingMode: "environment" } }, null);

    cameraFeed.on("webcamstarted", (e) => {
      scene.background = e.texture;
    });
    cameraFeed.on("webcamerror", (e) => {
      alert(`Webcam error: code ${e.code} message ${e.message}`);
    });

    window.addEventListener("resize", () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });

    let firstFix = true;
    const sensorController = new SensorController(camera);

    sensorController.on("deviceorientationgranted", (e) => {
      e.target.connect();
    });
    sensorController.on("deviceorientationerror", (e) => {
      alert(`Device orientation error: code ${e.code} message ${e.message}`);
    });
    sensorController.init();

    gpsManager.on("gpserror", (e) => {
      alert(`GPS error: ${e.code}`);
    });

    gpsManager.on("gpsupdate", (e) => {
      if (firstFix) {
        alert(
          `Got the initial location: longitude ${e.position.coords.longitude}, latitude ${e.position.coords.latitude}`
        );

        const positions = [
          { latDis: 5e-4, lonDis: 0, colour: 16711680 },   // red - north
          { latDis: -5e-4, lonDis: 0, colour: 16776960 },  // yellow - south
          { latDis: 0, lonDis: -5e-4, colour: 65535 },     // blue - west
          { latDis: 0, lonDis: 5e-4, colour: 65280 },      // green - east
        ];

        const boxGeometry = new BoxGeometry(10, 10, 10);
        for (const p of positions) {
          const mesh = new Mesh(boxGeometry, new MeshBasicMaterial({ color: p.colour }));
          gpsManager.add(
            mesh,
            e.position.coords.longitude + p.lonDis,
            e.position.coords.latitude + p.latDis
          );
        }
        firstFix = false;
      }
    });

    gpsManager.startGps();

    document.getElementById("setFakeLoc").addEventListener("click", () => {
      alert("Using fake input GPS, not real GPS location");
      gpsManager.stopGps();
      gpsManager.fakeGps(
        parseFloat(document.getElementById("fakeLon").value),
        parseFloat(document.getElementById("fakeLat").value)
      );
    });

    renderer.setAnimationLoop(renderFrame);
    function renderFrame() {
      sensorController?.update();
      renderer.render(scene, camera);
    }