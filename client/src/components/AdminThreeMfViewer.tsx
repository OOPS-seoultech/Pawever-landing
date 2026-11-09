import { useEffect, useId, useRef, useState } from "react";
import * as THREE from "three";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { adminRequest } from "@/lib/adminApi";
import {
  inspectThreeMf,
  previewByteLimit,
  readPreviewFile,
} from "@/lib/threeMfPreview";
import { Button } from "./ui/button";

export default function AdminThreeMfViewer({
  artifactId,
  size,
}: {
  artifactId: string;
  size: number;
}) {
  const guideId = useId();
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<(direction: string) => void>(() => {});
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("3D 모델을 불러오는 중…");
  const [error, setError] = useState("");
  useEffect(() => {
    const host = container.current!;
    const abort = new AbortController();
    let disposed = false;
    let renderer: THREE.WebGLRenderer | undefined;
    let controls: OrbitControls | undefined;
    let observer: ResizeObserver | undefined;
    const scene = new THREE.Scene();
    const urls = new Set<string>();
    const release = () => {
      controls?.dispose();
      observer?.disconnect();
      const textures = new Set<THREE.Texture>(),
        materials = new Set<THREE.Material>(),
        geometries = new Set<THREE.BufferGeometry>();
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          materials.add(material);
          for (const value of Object.values(material))
            if (value instanceof THREE.Texture) textures.add(value);
        }
      });
      textures.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      geometries.forEach(item => item.dispose());
      scene.clear();
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
      renderer = undefined;
      view.current = () => {};
    };
    setStatus("3D 모델을 불러오는 중…");
    setError("");
    void (async () => {
      try {
        if (size > previewByteLimit)
          throw new Error("200MB를 넘는 모델은 내려받아 확인해 주세요.");
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setClearColor(0x161616);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.domElement.setAttribute(
          "aria-label",
          "드래그로 회전하는 3D 모델"
        );
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.tabIndex = 0;
        renderer.domElement.setAttribute("aria-describedby", guideId);
        renderer.domElement.className =
          "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";
        host.appendChild(renderer.domElement);
        const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10000);
        const render = () => {
          if (!disposed && renderer) renderer.render(scene, camera);
        };
        const manager = new THREE.LoadingManager(render);
        manager.setURLModifier(url => {
          if (!url.startsWith("blob:"))
            throw new Error("모델 내부의 외부 파일은 불러오지 않습니다.");
          urls.add(url);
          return url;
        });
        let response: Response | undefined;
        for (let retry = 0; retry < 2; retry++) {
          const link = await adminRequest<{ url: string }>(
            `/api/production/artifacts/${encodeURIComponent(artifactId)}/download-link`,
            { method: "POST", signal: abort.signal }
          );
          response = await fetch(link.url, {
            signal: abort.signal,
            cache: "no-store",
          });
          if (![401, 403].includes(response.status)) break;
          await response.body?.cancel();
        }
        const data = await readPreviewFile(response!);
        if (disposed) return;
        inspectThreeMf(data);
        const model = new ThreeMFLoader(manager).parse(data);
        scene.add(model);
        let faces = 0;
        model.traverse(object => {
          if (object instanceof THREE.Mesh)
            faces +=
              (object.geometry.index?.count ??
                object.geometry.getAttribute("position").count) / 3;
        });
        if (faces > 3000000)
          throw new Error(
            "반복 부품이 많은 모델입니다. 내려받아 확인해 주세요."
          );
        model.rotation.x = -Math.PI / 2;
        const bounds = new THREE.Box3().setFromObject(model);
        const radius = bounds.getSize(new THREE.Vector3()).length() / 2;
        if (!Number.isFinite(radius) || radius <= 0)
          throw new Error("표시할 3D 형상이 없습니다.");
        model.position.sub(bounds.getCenter(new THREE.Vector3()));
        scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1));
        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(1, 2, 3);
        scene.add(light);
        camera.near = radius / 1000;
        camera.far = radius * 100;
        controls = new OrbitControls(camera, renderer!.domElement);
        controls.listenToKeyEvents(renderer.domElement);
        controls.enablePan = true;
        controls.enableDamping = false;
        controls.minDistance = radius * 0.3;
        controls.maxDistance = radius * 20;
        controls.addEventListener("change", render);
        const distance =
          (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.15;
        view.current = direction => {
          if (direction === "zoomIn" || direction === "zoomOut") {
            const offset = camera.position
              .clone()
              .sub(controls!.target)
              .multiplyScalar(direction === "zoomIn" ? 0.8 : 1.25)
              .clampLength(controls!.minDistance, controls!.maxDistance);
            camera.position.copy(controls!.target).add(offset);
            controls!.update();
            render();
            return;
          }
          const positions: Record<string, number[]> = {
            front: [0, 0, 1],
            left: [-1, 0, 0],
            right: [1, 0, 0],
            back: [0, 0, -1],
          };
          const [x, y, z] = positions[direction] ?? positions.front;
          camera.position.set(x * distance, y * distance, z * distance);
          controls!.target.set(0, 0, 0);
          controls!.update();
          render();
        };
        const resize = () => {
          if (disposed || !renderer) return;
          const width = host.clientWidth,
            height = host.clientHeight;
          camera.aspect = width / Math.max(height, 1);
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
          render();
        };
        observer = new ResizeObserver(resize);
        observer.observe(host);
        view.current("front");
        resize();
        setStatus("3D 모델 준비 완료");
      } catch (e) {
        if (disposed) return;
        abort.abort();
        release();
        setError(
          e instanceof Error ? e.message : "모델 미리보기를 열지 못했습니다."
        );
        setStatus("");
      }
    })();
    return () => {
      disposed = true;
      abort.abort();
      release();
    };
  }, [artifactId, size, attempt, guideId]);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap gap-2" aria-label="3D 시점 선택">
        {[
          ["front", "정면"],
          ["left", "왼쪽"],
          ["right", "오른쪽"],
          ["back", "뒷면"],
        ].map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant="outline"
            disabled={status !== "3D 모델 준비 완료"}
            onClick={() => view.current(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={status !== "3D 모델 준비 완료"}
          onClick={() => view.current("zoomIn")}
          aria-label="3D 확대"
        >
          + 확대
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={status !== "3D 모델 준비 완료"}
          onClick={() => view.current("zoomOut")}
          aria-label="3D 축소"
        >
          − 축소
        </Button>
      </div>
      <p id={guideId} className="text-xs text-muted-foreground">
        드래그: 회전 · 휠: 확대/축소 · 오른쪽 드래그: 이동. 키보드로는 위 시점
        버튼을 이용하세요.
      </p>
      <div
        ref={container}
        className="min-h-[300px] flex-1 overflow-hidden rounded-[15px] bg-[#161616] [&>canvas]:block [&>canvas]:touch-none"
      />
      {status && (
        <p role="status" className="text-xs text-muted-foreground">
          {status}
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-2 text-sm">
          <p>{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAttempt(n => n + 1)}
          >
            다시 불러오기
          </Button>
        </div>
      )}
    </div>
  );
}
