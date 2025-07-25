import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import './App.css';

// 과일 종류 정의
const FRUITS = [
  { radius: 20, color: '#FFD700', name: 'cherry', score: 10, nextFruitIndex: 1, image: '/fruits/00_cherry.png', originalWidth: 33, originalHeight: 46 },
  { radius: 30, color: '#FFA500', name: 'strawberry', score: 20, nextFruitIndex: 2, image: '/fruits/01_strawberry.png', originalWidth: 43, originalHeight: 48 },
  { radius: 40, color: '#FF4500', name: 'grape', score: 30, nextFruitIndex: 3, image: '/fruits/02_grape.png', originalWidth: 61, originalHeight: 61 },
  { radius: 50, color: '#FF0000', name: 'tangerine', score: 40, nextFruitIndex: 4, image: '/fruits/03_gyool.png', originalWidth: 69, originalHeight: 76 },
  { radius: 60, color: '#FF1493', name: 'orange', score: 50, nextFruitIndex: 5, image: '/fruits/04_orange.png', originalWidth: 89, originalHeight: 95 },
  { radius: 70, color: '#FF69B4', name: 'apple', score: 60, nextFruitIndex: 6, image: '/fruits/05_apple.png', originalWidth: 114, originalHeight: 117 },
  { radius: 80, color: '#DA70D6', name: 'pear', score: 70, nextFruitIndex: 7, image: '/fruits/06_pear.png', originalWidth: 129, originalHeight: 137 },
  { radius: 90, color: '#8A2BE2', name: 'peach', score: 80, nextFruitIndex: 8, image: '/fruits/07_peach.png', originalWidth: 161, originalHeight: 156 },
  { radius: 100, color: '#4B0082', name: 'pineapple', score: 90, nextFruitIndex: 9, image: '/fruits/08_pineapple.png', originalWidth: 177, originalHeight: 204 },
  { radius: 110, color: '#0000CD', name: 'melon', score: 100, nextFruitIndex: 10, image: '/fruits/09_melon.png', originalWidth: 220, originalHeight: 220 },
  { radius: 120, color: '#00BFFF', name: 'watermelon', score: 110, nextFruitIndex: -1, image: '/fruits/10_watermelon.png', originalWidth: 259, originalHeight: 259 }, // 마지막 과일은 병합되지 않음
];

function App() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Matter.Engine.create());
  const [nextFruitIndex, setNextFruitIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [canDrop, setCanDrop] = useState(true); // 새로운 과일을 떨어뜨릴 수 있는지 여부
  const [imagesLoaded, setImagesLoaded] = useState(false); // 이미지 로딩 상태
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; radius: number }>>([]); // 파티클 상태

  // 이벤트 리스너를 위한 최신 상태 값 참조
  const nextFruitIndexRef = useRef(nextFruitIndex);
  const gameOverRef = useRef(gameOver);
  const previewFruitRef = useRef<HTMLDivElement>(null); // 미리보기 과일 참조
  const canDropRef = useRef(canDrop); // canDrop 상태 참조

  // 안정적인 콜백에서 사용될 점수 및 게임 오버 상태를 위한 Ref
  const scoreRef = useRef(score);
  const setScoreRef = useRef(setScore);
  const setGameOverRef = useRef(setGameOver);

  // 게임 오버 타이머를 위한 Ref
  const gameOverTimerRef = useRef<number | null>(null);

  // 로드된 이미지 객체를 저장할 Ref
  const loadedImages = useRef<{ [key: string]: HTMLImageElement }>({});

  useEffect(() => {
    nextFruitIndexRef.current = nextFruitIndex;
  }, [nextFruitIndex]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    setScoreRef.current = setScore;
  }, [setScore]);

  useEffect(() => {
    setGameOverRef.current = setGameOver;
  }, [setGameOver]);

  useEffect(() => {
    canDropRef.current = canDrop;
  }, [canDrop]);

  // 이미지 미리 로딩
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = FRUITS.length;

    FRUITS.forEach((fruit) => {
      const img = new Image();
      img.src = fruit.image;
      img.onload = () => {
        loadedCount++;
        loadedImages.current[fruit.name] = img; // 이미지 객체 저장
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load image: ${fruit.image}`);
        loadedCount++; // 에러 발생해도 카운트 증가시켜 로딩 완료 처리
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
    });
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  const resetGame = () => {
    // 월드에서 모든 바디 제거
    Matter.World.clear(engineRef.current.world, false);
    Matter.Engine.clear(engineRef.current);

    // 새 엔진 인스턴스 생성
    engineRef.current = Matter.Engine.create();

    // 상태 초기화
    setScore(0);
    setGameOver(false);
    setNextFruitIndex(Math.floor(Math.random() * 3));
    setCanDrop(true); // 게임 재시작 시 canDrop을 true로 설정

    // 게임 오버 타이머 초기화
    if (gameOverTimerRef.current) {
      clearTimeout(gameOverTimerRef.current);
      gameOverTimerRef.current = null;
    }

    // 새 엔진 월드에 벽과 바닥 다시 추가
    const engine = engineRef.current;
    const ground = Matter.Bodies.rectangle(200, 690, 400, 20, { isStatic: true, label: 'ground' });
    const leftWall = Matter.Bodies.rectangle(10, 350, 20, 700, { isStatic: true, label: 'wall' });
    const rightWall = Matter.Bodies.rectangle(390, 350, 20, 700, { isStatic: true, label: 'wall' });
    const gameOverLine = Matter.Bodies.rectangle(200, 50, 400, 10, { isStatic: true, isSensor: true, label: 'gameOverLine', render: { fillStyle: 'rgba(255, 255, 0, 0.8)' } });
    Matter.World.add(engine.world, [ground, leftWall, rightWall, gameOverLine]);
  };

  // collisionHandler를 useCallback으로 정의하여 안정성 확보
  const collisionHandler = useCallback((event: Matter.IEventCollision<Matter.Engine>) => {
    const pairs = event.pairs;

    pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;

      // 두 바디가 모두 과일이고 같은 라벨(같은 과일 종류)을 가졌는지 확인
      if (bodyA.label.startsWith('fruit-') && bodyB.label.startsWith('fruit-') && bodyA.label === bodyB.label) {
        const fruitIndex = parseInt(bodyA.label.split('-')[1]);
        const nextFruitData = FRUITS[fruitIndex].nextFruitIndex !== -1 ? FRUITS[FRUITS[fruitIndex].nextFruitIndex] : null;

        if (nextFruitData) {
          // 충돌 지점 계산
          const collisionX = (bodyA.position.x + bodyB.position.x) / 2;
          const collisionY = (bodyA.position.y + bodyB.position.y) / 2;

          // 파티클 생성
          setParticles((prevParticles) => [
            ...prevParticles,
            { id: Date.now() + Math.random(), x: collisionX, y: collisionY, color: nextFruitData.color, radius: nextFruitData.radius },
          ]);

          // 충돌한 과일 제거
          Matter.World.remove(engineRef.current.world, [bodyA, bodyB]);

          // 충돌 지점에 새롭고 더 큰 과일 생성
          const mergedFruit = Matter.Bodies.circle(collisionX, collisionY, nextFruitData.radius, {
            render: {
              sprite: {
                texture: nextFruitData.image, // 이미지 경로 사용
                xScale: (nextFruitData.radius * 2) / nextFruitData.originalWidth, // 실제 이미지 너비 사용
                yScale: (nextFruitData.radius * 2) / nextFruitData.originalHeight, // 실제 이미지 높이 사용
              },
            },
            label: `fruit-${FRUITS[fruitIndex].nextFruitIndex}`,
            restitution: 0.2,
            friction: 0.001,
            density: 0.001,
          });
          Matter.World.add(engineRef.current.world, mergedFruit);

          // setter 참조를 사용하여 점수 업데이트
          setScoreRef.current((prevScore) => prevScore + nextFruitData.score);
        }
      }
    });
  }, []); // 안정성을 위한 빈 의존성 배열

  // Matter.js 설정 및 정리(cleanup)를 위한 별도의 useEffect
  useEffect(() => {
    // 이미지가 로드되지 않았다면 Matter.js 초기화하지 않음
    if (!imagesLoaded) return;

    const engine = engineRef.current;
    let render: Matter.Render;
    let runner: Matter.Runner;

    if (sceneRef.current) {
      render = Matter.Render.create({
        element: sceneRef.current,
        engine: engine,
        options: {
          width: 400,
          height: 700,
          wireframes: false,
          background: '#f0f0f0',
        },
      });

      Matter.Render.run(render);
      runner = Matter.Runner.create();
      Matter.Runner.run(runner, engine);

      // 벽과 바닥 추가 (resetGame에 의해 이미 추가되지 않은 경우에만)
      if (engine.world.bodies.length === 0 || !engine.world.bodies.some(body => body.label === 'ground')) {
        const ground = Matter.Bodies.rectangle(200, 690, 400, 20, { isStatic: true, label: 'ground' });
        const leftWall = Matter.Bodies.rectangle(10, 350, 20, 700, { isStatic: true, label: 'wall' });
        const rightWall = Matter.Bodies.rectangle(390, 350, 20, 700, { isStatic: true, label: 'wall' });
        const gameOverLine = Matter.Bodies.rectangle(200, 50, 400, 10, { isStatic: true, isSensor: true, label: 'gameOverLine', render: { fillStyle: 'rgba(255, 255, 0, 0.8)' } });
        Matter.World.add(engine.world, [ground, leftWall, rightWall, gameOverLine]);
      }

      Matter.Events.on(engine, 'collisionStart', collisionHandler);

      // 게임 오버 로직 개선: afterUpdate 이벤트 사용
      Matter.Events.on(engine, 'afterUpdate', () => {
        if (gameOverRef.current) return; // 이미 게임 오버 상태면 중단

        let fruitAboveLine = false;
        const gameOverY = 50; // 게임 오버 라인의 Y 좌표 (실제 라인 상단 경계)

        for (const body of engine.world.bodies) {
          if (body.label.startsWith('fruit-') && body.position.y - body.circleRadius! < gameOverY) {
            fruitAboveLine = true;
            break;
          }
        }

        if (fruitAboveLine) {
          if (!gameOverTimerRef.current) {
            // 타이머가 시작되지 않았다면 시작
            gameOverTimerRef.current = setTimeout(() => {
              setGameOverRef.current(true);
              console.log("Game Over! (Timed)");
            }, 2000); // 2초 동안 라인 위에 있으면 게임 오버
          }
        } else {
          // 라인 위에 과일이 없으면 타이머 초기화
          if (gameOverTimerRef.current) {
            clearTimeout(gameOverTimerRef.current);
            gameOverTimerRef.current = null;
          }
        }
      });
    }

    return () => {
      if (render) {
        Matter.Render.stop(render);
        render.canvas.remove();
        render.textures = {};
      }
      if (runner) {
        Matter.Runner.stop(runner);
      }
      // 충돌 이벤트 리스너 제거
      Matter.Events.off(engine, 'collisionStart', collisionHandler);
      Matter.Events.off(engine, 'afterUpdate'); // afterUpdate 이벤트 리스너 제거
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);

      // 게임 오버 타이머 초기화
      if (gameOverTimerRef.current) {
        clearTimeout(gameOverTimerRef.current);
        gameOverTimerRef.current = null;
      }
    };
  }, [collisionHandler, imagesLoaded]);

  const handleDrop = useCallback((xPosition: number) => {
    if (gameOverRef.current || !canDropRef.current) return;

    if (!sceneRef.current) return;

    const fruit = FRUITS[nextFruitIndexRef.current];

    const newFruit = Matter.Bodies.circle(xPosition, 0, fruit.radius, {
      render: {
        sprite: {
          texture: fruit.image,
          xScale: (fruit.radius * 2) / fruit.originalWidth,
          yScale: (fruit.radius * 2) / fruit.originalHeight,
        },
      },
      label: `fruit-${nextFruitIndexRef.current}`,
      restitution: 0.2,
      friction: 0.001,
      density: 0.001,
    });
    Matter.World.add(engineRef.current.world, newFruit);

    setCanDrop(false);
    setTimeout(() => {
      setCanDrop(true);
    }, 1000);

    setNextFruitIndex(Math.floor(Math.random() * 3));
  }, []);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const mouseX = event.clientX - sceneRef.current!.getBoundingClientRect().left;
      handleDrop(mouseX);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touchX = event.touches[0].clientX - sceneRef.current!.getBoundingClientRect().left;
      handleDrop(touchX);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (gameOverRef.current || !sceneRef.current || !previewFruitRef.current || !imagesLoaded) return;

      const mouseX = event.clientX - sceneRef.current.getBoundingClientRect().left;
      const fruit = FRUITS[nextFruitIndexRef.current];

      previewFruitRef.current.style.left = `${mouseX - fruit.radius}px`;
      previewFruitRef.current.style.width = `${fruit.radius * 2}px`;
      previewFruitRef.current.style.height = `${fruit.radius * 2}px`;
      previewFruitRef.current.style.backgroundImage = `url(${fruit.image})`;
      previewFruitRef.current.style.backgroundSize = '100% 100%';
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (gameOverRef.current || !sceneRef.current || !previewFruitRef.current || !imagesLoaded) return;

      const touchX = event.touches[0].clientX - sceneRef.current.getBoundingClientRect().left;
      const fruit = FRUITS[nextFruitIndexRef.current];

      previewFruitRef.current.style.left = `${touchX - fruit.radius}px`;
      previewFruitRef.current.style.width = `${fruit.radius * 2}px`;
      previewFruitRef.current.style.height = `${fruit.radius * 2}px`;
      previewFruitRef.current.style.backgroundImage = `url(${fruit.image})`;
      previewFruitRef.current.style.backgroundSize = '100% 100%';
    };

    const handleMouseLeave = () => {
      if (previewFruitRef.current) {
        previewFruitRef.current.style.display = 'none';
      }
    };

    const handleMouseEnter = () => {
      if (previewFruitRef.current && !gameOverRef.current) {
        previewFruitRef.current.style.display = 'block';
      }
    };

    const currentSceneRef = sceneRef.current;

    if (currentSceneRef) {
      currentSceneRef.addEventListener('mousedown', handleMouseDown);
      currentSceneRef.addEventListener('touchstart', handleTouchStart);
      currentSceneRef.addEventListener('mousemove', handleMouseMove);
      currentSceneRef.addEventListener('touchmove', handleTouchMove);
      currentSceneRef.addEventListener('mouseleave', handleMouseLeave);
      currentSceneRef.addEventListener('mouseenter', handleMouseEnter);
    }

    return () => {
      if (currentSceneRef) {
        currentSceneRef.removeEventListener('mousedown', handleMouseDown);
        currentSceneRef.removeEventListener('touchstart', handleTouchStart);
        currentSceneRef.removeEventListener('mousemove', handleMouseMove);
        currentSceneRef.removeEventListener('touchmove', handleTouchMove);
        currentSceneRef.removeEventListener('mouseleave', handleMouseLeave);
        currentSceneRef.removeEventListener('mouseenter', handleMouseEnter);
      }
    };
  }, [handleDrop, imagesLoaded]);

  // nextFruitIndex 변경 시 미리보기 과일 업데이트
  useEffect(() => {
    if (!previewFruitRef.current || !imagesLoaded) return; // 미리보기 Ref 없거나 이미지 로드 안됐으면 리턴

    const fruit = FRUITS[nextFruitIndex];
    previewFruitRef.current.style.backgroundImage = `url(${fruit.image})`;
    previewFruitRef.current.style.width = `${fruit.radius * 2}px`;
    previewFruitRef.current.style.height = `${fruit.radius * 2}px`;
    
  }, [nextFruitIndex, imagesLoaded]); // nextFruitIndex와 imagesLoaded에 의존

  return (
    <div className="App">
      <h1>수박 게임</h1>
      <div ref={sceneRef} style={{ border: '1px solid black', width: 400, height: 700, position: 'relative', overflow: 'hidden' }}>
        {/* 게임 오버 라인 시각화 */} 
        <div style={{ position: 'absolute', top: '50px', left: '0', width: '100%', height: '2px', borderTop: '2px dashed yellow', zIndex: 0 }} />
        {particles.length > 0 && particles.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              position: 'absolute',
              left: `${p.x - p.radius}px`,
              top: `${p.y - p.radius}px`,
              width: `${p.radius * 2}px`,
              height: `${p.radius * 2}px`,
              backgroundColor: p.color,
              borderRadius: '50%',
              opacity: 0.8,
              zIndex: 2,
              animation: 'fade-out-scale-up 0.5s forwards',
            }}
          />
        ))}
        <div ref={previewFruitRef} className="preview-fruit" style={{ position: 'absolute', top: '0px', borderRadius: '50%', opacity: 0.6, pointerEvents: 'none', display: 'none', zIndex: 1 }}></div>
      </div>
      <div style={{ marginTop: '20px' }}>
        <p>다음 과일: {FRUITS[nextFruitIndex].name}</p>
        <p>점수: {score}</p>
        {gameOver && (
          <div style={{ marginTop: '10px' }}>
            <p style={{ color: 'red', fontWeight: 'bold' }}>게임 오버!</p>
            <button onClick={resetGame}>게임 재시작</button>
          </div>
        )}
      </div>
      {!imagesLoaded && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px', color: '#333' }}>이미지 로딩 중...</div>} {/* 로딩 인디케이터 */}
    </div>
  );
}

export default App;