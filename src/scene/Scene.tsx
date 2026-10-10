import { useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { markSceneReady, slots } from "./state";
import { View, precompileAll } from "./View";
import HeroDesk, { heroCam } from "./HeroDesk";
import Journey, { journeyCam } from "./Journey";
import Join, { joinCam } from "./Join";
import MobileScene from "./MobileScene";

/* Jeden WebGL kontext pro celou stránku. Každá 3D ukázka je View, které kreslí
   do obdélníku svého DOM prvku. Snímek pohání ticker GSAPu hned po Lenisu,
   takže 3D nezaostává za scrollem ani o snímek. */

function Driver() {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    // R3F v režimu "never" bere čas v sekundách (rovnou ho zapíše do clock.elapsedTime)
    const tick = (time: number) => advance(time);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [advance]);
  // views kreslí bez mazání, plátno se maže jednou na začátku snímku
  useFrame(({ gl }) => {
    gl.setScissorTest(false);
    gl.clear(true, true);
  }, 0);
  return null;
}

/* Po připojení všech scén je předkompiluje a ohlásí připravenost. */
function Precompile() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    let alive = true;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        precompileAll(gl, () => alive && markSceneReady()).catch(() => alive && markSceneReady());
      })
    );
    return () => void (alive = false);
  }, [gl]);
  return null;
}

/* Na dotykových zařízeních vlastní plátno v každém rámečku (viz MobileScene), jinak jedno sdílené. */
const touch = typeof matchMedia !== "undefined" && matchMedia("(hover: none)").matches;

export default function Scene() {
  if (touch) {
    return (
      <MobileScene
        stages={[
          { slot: slots.hero, cam: heroCam, C: HeroDesk },
          { slot: slots.journey, cam: journeyCam, C: Journey },
          { slot: slots.contact, cam: joinCam, C: Join },
        ]}
      />
    );
  }
  return (
    <Canvas
      className="gl"
      frameloop="never"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.autoClear = false;
        // kontrola logů shaderů při prvním použití stojí na ANGLE/D3D stovky ms a zasekne scroll
        gl.debug.checkShaderErrors = false;
        if (import.meta.env.DEV) (window as unknown as { __gl: unknown }).__gl = gl;
      }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5 }}
    >
      <Driver />
      <View slot={slots.hero} cam={heroCam} priority={0}>
        <HeroDesk />
      </View>
      <View slot={slots.journey} cam={journeyCam}>
        <Journey />
      </View>
      <View slot={slots.contact} cam={joinCam}>
        <Join />
      </View>
      <Precompile />
    </Canvas>
  );
}
